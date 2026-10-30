//! 任务栏旁日历弹窗：定位、`PopupManager` 实现与失焦隐藏策略。
use super::{get_window_hwnd, refresh_shared_frameless_window, CalendarWindowManager};
use crate::window_manager::shared::popup_manager::PopupManager;
use crate::windows_hook::get_taskbar_info;
use crate::popup_epoch::POPUP_EPOCH;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::time::Duration;
use tauri::{Emitter, Manager, WebviewWindow};
use windows::Win32::{
    Foundation::{RECT, POINT},
    UI::WindowsAndMessaging::{GetAncestor, WindowFromPoint, SetForegroundWindow, GA_ROOT, GA_ROOTOWNER},
};

/// 表示“在系统时钟附近展示”的挂起坐标哨兵值。
const PENDING_SHOW_NEAR_CLOCK: (i32, i32) = (99_999, 99_999);

/// 原生窗口在前端退场动画结束前仍然处于 visible 状态。
/// 单独记录逻辑关闭状态，避免这段时间里下一次任务栏点击再次被误判成“关闭”。
static POPUP_HIDE_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

impl PopupManager for CalendarWindowManager {
    /// 请求前端执行退场动画；动画结束后由 WebView 自己 hide，保留实例以便快速再次显示。
    fn hide_popup(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        self.suppress_popup_auto_hide.store(false, Ordering::SeqCst);
        if let Some(popup_window) = &self.taskbar_popup_window {
            Self::request_popup_hide(popup_window, POPUP_EPOCH.current());
        }
        Ok(())
    }

    /// 检查任务栏弹窗当前是否处于逻辑可见状态。
    /// 关闭动画一开始即视为“不可见”，允许用户立刻再次点击任务栏重新打开。
    fn is_popup_visible(&self) -> bool {
        !POPUP_HIDE_IN_PROGRESS.load(Ordering::SeqCst)
            && self
                .taskbar_popup_window
                .as_ref()
                .map(|w| w.is_visible().unwrap_or(false))
                .unwrap_or(false)
    }

    /// 在系统时钟附近显示日历窗口，首次创建时先缓存展示意图等待前端就绪。
    fn show_popup_near_clock(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        // 检查后端是否已存活名为 "calendar" 的窗口
        let has_live_popup_window = self.app_handle.get_webview_window("calendar").is_some();
        if let Some(popup_window) = self.ensure_taskbar_popup_window() {
            // 如果窗口刚被创建且前端尚未就绪，则缓存系统时钟附近展示请求
            if !has_live_popup_window {
                self.pending_popup_click_position = Some(PENDING_SHOW_NEAR_CLOCK);
                println!("日历窗口已创建，等待前端就绪信号");
                return Ok(());
            }

            let popup_window = popup_window.clone();
            // 获取任务栏信息计算位置
            if let Some((taskbar_rect, is_horizontal)) = get_taskbar_info() {
                let (popup_x, popup_y) =
                    self.calculate_window_position(&taskbar_rect, is_horizontal);
                self.present_popup_window(
                    &popup_window,
                    Some(tauri::PhysicalPosition { x: popup_x, y: popup_y }),
                )?;
                println!("日历窗口已显示在位置 ({}, {})", popup_x, popup_y);
            } else {
                self.present_popup_window(&popup_window, None)?;
            }
        }
        Ok(())
    }

    /// 按给定点击坐标显示任务栏弹窗，必要时等待窗口首次初始化完成。
    ///
    /// * `click_x` - 点击的横坐标
    /// * `click_y` - 点击的纵坐标
    fn show_popup_at_position(
        &mut self,
        click_x: i32,
        click_y: i32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let has_live_popup_window = self.app_handle.get_webview_window("calendar").is_some();
        if let Some(popup_window) = self.ensure_taskbar_popup_window() {
            if !has_live_popup_window {
                // 记录点击坐标，待前端准备好后再展示
                self.pending_popup_click_position = Some((click_x, click_y));
                println!("日历窗口已创建，等待前端就绪后再按坐标显示");
                return Ok(());
            }

            let popup_window = popup_window.clone();
            // 计算安全的窗口显示位置，防止超出屏幕
            let (popup_x, popup_y) = self.calculate_safe_position(click_x, click_y);
            println!("🎯 计算出的窗口位置: ({}, {})", popup_x, popup_y);
            self.present_popup_window(
                &popup_window,
                Some(tauri::PhysicalPosition { x: popup_x, y: popup_y }),
            )?;
            println!(
                "✅ 日历窗口已使用Tauri原生API定位: 点击位置({}, {}) -> 窗口位置: ({}, {})",
                click_x, click_y, popup_x, popup_y
            );
        }
        Ok(())
    }

    /// 在前端弹窗就绪后处理此前缓存的展示请求。
    fn on_popup_ready(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        // 如果存在挂起的坐标则进行处理
        if let Some((click_x, click_y)) = self.pending_popup_click_position.take() {
            println!("日历前端已就绪，执行挂起的显示请求 ({}, {})", click_x, click_y);
            if (click_x, click_y) == PENDING_SHOW_NEAR_CLOCK {
                self.show_popup_near_clock()?;
            } else {
                self.show_popup_at_position(click_x, click_y)?;
            }
        }
        Ok(())
    }

    /// 设置弹窗是否固定。
    fn set_popup_pin(&mut self, pin: bool) -> Result<(), Box<dyn std::error::Error>> {
        self.is_pinned.store(pin, Ordering::SeqCst);
        Ok(())
    }
}

impl CalendarWindowManager {
    pub fn set_startup_popup_persistence(&self, enabled: bool) {
        self.suppress_popup_auto_hide.store(enabled, Ordering::SeqCst);
    }

    /// 挂起"贴近时钟显示"请求，等前端 `popup_ready` 信号后再执行。
    pub fn queue_show_near_clock_on_ready(&mut self) {
        self.pending_popup_click_position = Some(PENDING_SHOW_NEAR_CLOCK);
    }

    /// 挂起"在指定坐标显示"请求，等前端 `popup_ready` 信号后再执行。
    pub fn queue_show_at_position_on_ready(&mut self, x: i32, y: i32) {
        self.pending_popup_click_position = Some((x, y));
    }

    /// 进入逻辑关闭阶段，并立即撤掉原生毛玻璃底板。
    /// 前端随后继续播放 V10 的收回动画，这样动画结束前不会留下整块浅色空壳。
    /// Only the existing mouse hook's separate DOWN events may dismiss.
    /// A mouse-up/move/focus change is never a dismissal trigger.
    pub fn dismiss_on_outside_press(&self, x:i32, y:i32) {
        let Some(window)=self.taskbar_popup_window.as_ref() else { return; };
        let target=window.clone();
        let app=self.app_handle.clone();
        let pinned=self.is_pinned.clone();
        let epoch=POPUP_EPOCH.current();
        let _=window.run_on_main_thread(move || {
            if !POPUP_EPOCH.accepts(epoch) || POPUP_HIDE_IN_PROGRESS.load(Ordering::SeqCst) { return; }
            let hit=unsafe { WindowFromPoint(POINT{x,y}) };
            if hit.0.is_null() { return; }
            let root=unsafe { GetAncestor(hit,GA_ROOT) };
            let owner=unsafe { GetAncestor(hit,GA_ROOTOWNER) };
            let own=app.webview_windows().values().any(|w| get_window_hwnd(w)
                .is_some_and(|h| h==root || h==owner));
            if crate::popup_input::dismiss_for_press(crate::popup_input::PointerPhase::Down,
                target.is_visible().unwrap_or(false),pinned.load(Ordering::SeqCst),
                crate::windows_hook::IS_MENU_OPEN.load(Ordering::SeqCst),false,own) {
                Self::request_popup_hide(&target,epoch);
            }
        });
    }

    pub fn popup_is_closing() -> bool { POPUP_HIDE_IN_PROGRESS.load(Ordering::SeqCst) }

    // All decisions and actual native hides run on the GUI thread. A callback
    // from an earlier opening can neither change the new state nor hide it.
    pub fn request_popup_hide(window: &WebviewWindow, epoch: u64) {
        let target=window.clone();
        let _ = window.run_on_main_thread(move || {
            if !POPUP_EPOCH.accepts(epoch) || POPUP_HIDE_IN_PROGRESS.swap(true, Ordering::SeqCst) { return; }
            Self::clear_window_vibrancy(&target);
            let _ = target.emit("calendar-popup-hide", epoch);
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_millis(450));
                let fallback=target.clone();
                let _ = target.run_on_main_thread(move || {
                    if POPUP_EPOCH.accepts(epoch) && POPUP_HIDE_IN_PROGRESS.load(Ordering::SeqCst) {
                        let _ = fallback.hide();
                    }
                });
            });
        });
    }

    fn present_popup_window(
        &self,
        popup_window: &WebviewWindow,
        position: Option<tauri::PhysicalPosition<i32>>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(position) = position {
            popup_window.set_position(tauri::Position::Physical(position))?;
        } else {
            popup_window.center()?;
        }
        // Clamp both size and position before showing: moving an oversized window
        // upward alone still leaves its bottom behind the taskbar.
        if let Ok(Some(monitor)) = popup_window.current_monitor() {
            if let Ok(size) = popup_window.outer_size() {
                let area = monitor.work_area();
                let gap = (12.0 * monitor.scale_factor()).round() as i32;
                let (x, y, width, height) = fit_popup(
                    area.position.x,
                    area.position.y,
                    area.size.width,
                    area.size.height,
                    size.width,
                    size.height,
                    gap,
                );
                if width != size.width || height != size.height {
                    let _ = popup_window.set_size(tauri::PhysicalSize::new(width, height));
                }
                let _ = popup_window.set_position(tauri::PhysicalPosition::new(x, y));
            }
        }
        let epoch = POPUP_EPOCH.next();
        // 如果用户在关闭动画尚未结束时再次点击任务栏，立即取消“正在关闭”。
        // 即使原生窗口物理上还 visible，也重新向前端发送 show 事件，让它反向展开。
        POPUP_HIDE_IN_PROGRESS.store(false, Ordering::SeqCst);
        self.reapply_saved_popup_vibrancy(popup_window);
        popup_window.show()?;
        // Always resynchronize the webview, even if the native frame remained visible.
        let _ = popup_window.emit("calendar-popup-show", epoch);
        // tao 0.34.8's focus fallback injects Alt when foreground permission is
        // denied. Request ordinary activation on the GUI thread instead.
        // If denied, keep the popup visible without synthesizing keyboard input.
        let focus_target = popup_window.clone();
        popup_window.run_on_main_thread(move || {
            if !POPUP_EPOCH.accepts(epoch) || !focus_target.is_visible().unwrap_or(false) { return; }
            if let Some(hwnd) = get_window_hwnd(&focus_target) {
                unsafe {
                    if !SetForegroundWindow(hwnd).as_bool() {
                        eprintln!("Windows未授予前台焦点，日历保持可见；未模拟任何按键");
                    }
                }
            }
        })?;
        Ok(())
    }

    fn reapply_saved_popup_vibrancy(&self, window: &WebviewWindow) {
        if self.popup_vibrancy_enabled {
            let _ = Self::apply_window_vibrancy(window, self.popup_vibrancy_effect.as_deref());
        } else {
            Self::clear_window_vibrancy(window);
        }
    }

    pub fn refresh_popup_chrome(window: &WebviewWindow) {
        refresh_shared_frameless_window(window, true);
    }

    /// 在锁外构建任务栏弹窗并绑定失焦自动隐藏事件，不需要持有 `window_manager` 锁。
    /// 构建完成后调用 `attach_popup_window` 将其存入 manager。
    pub fn build_popup_window(
        app_handle: &tauri::AppHandle,
        _is_pinned: Arc<AtomicBool>,
        _suppress_popup_auto_hide: Arc<AtomicBool>,
        _popup_last_show_input_tick: Arc<std::sync::atomic::AtomicU32>,
    ) -> Option<WebviewWindow> {
        let popup_window = tauri::WebviewWindowBuilder::new(
            app_handle,
            "calendar",
            tauri::WebviewUrl::App("index.html?window=popup".into()),
        )
        .title("松鼠日历")
        .inner_size(360.0, 520.0)
        .resizable(false)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .visible(false)
        .focused(false)
        .skip_taskbar(true)
        .build()
        .ok()?;

        Some(popup_window)
    }

    /// 将已构建好的弹窗存入 manager 并应用毛玻璃效果（需持锁调用）。
    pub fn attach_popup_window(&mut self, popup_window: WebviewWindow) {
        POPUP_HIDE_IN_PROGRESS.store(false, Ordering::SeqCst);
        self.reapply_saved_popup_vibrancy(&popup_window);
        self.taskbar_popup_window = Some(popup_window);
    }

    /// 确保任务栏弹窗存在；若句柄失效则重建，并绑定失焦自动隐藏行为（持锁版）。
    fn ensure_taskbar_popup_window(&mut self) -> Option<&WebviewWindow> {
        // 如果实例存在但 WebView 实际窗口已经销毁，清理实例
        if self.taskbar_popup_window.is_some()
            && self.app_handle.get_webview_window("calendar").is_none()
        {
            self.taskbar_popup_window = None;
            POPUP_HIDE_IN_PROGRESS.store(false, Ordering::SeqCst);
        }

        if self.taskbar_popup_window.is_none() {
            let popup_window = Self::build_popup_window(
                &self.app_handle.clone(),
                self.is_pinned.clone(),
                self.suppress_popup_auto_hide.clone(),
                self.popup_last_show_input_tick.clone(),
            )?;
            self.attach_popup_window(popup_window);
        }
        self.taskbar_popup_window.as_ref()
    }

    /// 关闭并释放任务栏弹窗窗口实例。
    pub fn close_calendar_window(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        POPUP_HIDE_IN_PROGRESS.store(false, Ordering::SeqCst);
        if let Some(popup_window) = self.taskbar_popup_window.take() {
            popup_window.close()?;
        }
        Ok(())
    }

    /// 在前端弹窗就绪后处理此前缓存的展示请求。
    pub fn on_calendar_ready(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        self.on_popup_ready()
    }

    /// 计算弹窗当前应使用的物理尺寸，优先读取窗口真实尺寸。
    fn calendar_physical_size(&self) -> (i32, i32) {
        if let Some(popup_window) = &self.taskbar_popup_window {
            // 尝试获取外部尺寸
            if let Ok(size) = popup_window.outer_size() {
                if size.width > 0 && size.height > 100 {
                    return (size.width as i32, size.height as i32);
                }
            }
            // 退而求其次尝试获取内部尺寸
            if let Ok(size) = popup_window.inner_size() {
                if size.width > 0 && size.height > 100 {
                    return (size.width as i32, size.height as i32);
                }
            }
            // 获取不到则使用逻辑尺寸和缩放因子计算
            let scale = popup_window.scale_factor().unwrap_or(1.0);
            ((360.0 * scale) as i32, (520.0 * scale) as i32)
        } else {
            (360, 520)
        }
    }

    fn calculate_safe_position(&self, _click_x: i32, _click_y: i32) -> (i32, i32) {
        let (width, height) = self.calendar_physical_size();
        let monitor = self
            .taskbar_popup_window
            .as_ref()
            .and_then(|w| w.current_monitor().ok().flatten())
            .or_else(|| self.app_handle.primary_monitor().ok().flatten());
        if let Some(m) = monitor {
            let area = m.work_area();
            let (x, y, _, _) = fit_popup(
                area.position.x,
                area.position.y,
                area.size.width,
                area.size.height,
                width.max(1) as u32,
                height.max(1) as u32,
                (12.0 * m.scale_factor()).round() as i32,
            );
            (x, y)
        } else {
            (12, 12)
        }
    }
    fn calculate_window_position(&self, _taskbar_rect: &RECT, _is_horizontal: bool) -> (i32, i32) {
        self.calculate_safe_position(0, 0)
    }
}

fn fit_popup(
    left: i32,
    top: i32,
    area_width: u32,
    area_height: u32,
    width: u32,
    height: u32,
    gap: i32,
) -> (i32, i32, u32, u32) {
    let gap = gap.max(0).min((area_width.min(area_height) / 4) as i32);
    let width = width.min(area_width.saturating_sub(2 * gap as u32)).max(1);
    let height = height.min(area_height.saturating_sub(gap as u32)).max(1);
    (
        left + area_width as i32 - width as i32,
        top + area_height as i32 - height as i32,
        width,
        height,
    )
}
#[cfg(test)]
mod tests {
    use super::fit_popup;
    #[test]
    fn taskbar_work_area_caps_oversized_popup_on_scaled_and_negative_monitors() {
        for (left, top, w, h, gap) in [
            (0, 0, 1920, 1032, 12),
            (0, 0, 1366, 720, 15),
            (-1920, -200, 1920, 1032, 18),
            (60, 40, 1200, 680, 24),
        ] {
            let (x, y, pw, ph) = fit_popup(left, top, w, h, 900, 1600, gap);
            assert!(x >= left + gap && y >= top + gap);
            assert_eq!(x + pw as i32, left + w as i32);
            assert_eq!(y + ph as i32, top + h as i32);
        }
    }
}

