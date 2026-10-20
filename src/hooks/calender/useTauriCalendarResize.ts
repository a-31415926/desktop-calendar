import { useConfigSync } from '../../sync/configStore.ts';
import { LogicalSize, PhysicalPosition } from '@tauri-apps/api/dpi';
import { listen } from '@tauri-apps/api/event';
import { currentMonitor, getCurrentWindow } from '@tauri-apps/api/window';
import { calendarLimits, popupPosition } from './calendarBounds.ts';
import { type RefObject, useLayoutEffect, useRef } from 'react';

/** 内容变化后重新贴近任务栏的轻量防抖。 */
const REPOSITION_NEAR_TASKBAR_MS = 40;
/** 浏览器逻辑像素比较时允许的亚像素误差。 */
const VIEWPORT_SIZE_TOLERANCE_PX = 1;
/** 高 DPI 下最多做三轮真实 viewport 校正，避免异步 resize 尚未落地时读到旧尺寸。 */
const MAX_RESIZE_CORRECTIONS = 3;
/** 距 Windows 可用工作区边缘的逻辑像素间距。 */


/** 等待 Windows / WebView2 真正提交一次窗口尺寸变化。 */
function waitForViewportCommit(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 24);
  });
}

/**
 * 将日历根节点的 CSS 逻辑像素尺寸同步给 Tauri 窗口。
 *
 * 这里不再手动把 CSS 尺寸乘 DPI。先按 LogicalSize 设置，再直接用浏览器
 * window.innerWidth / innerHeight 校验 WebView 真正拿到的逻辑 viewport；若仍偏小，
 * 迭代补足差额。任务栏弹窗则使用 Tauri monitor.workArea 重新定位，避免 Rust/Win32
 * 屏幕指标在高 DPI 组合下出现坐标单位不一致而把右侧或底部送出屏幕。
 */
export function useTauriCalendarResize(
  autoResizeWindow: boolean,
): RefObject<HTMLDivElement | null> {
  /** 挂载在日历最外层 div，供 ResizeObserver 测量。 */
  const scale = useConfigSync(s => s.data.calendarScale);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const repositionTaskbarPopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (!autoResizeWindow) {
      return;
    }
    const el = containerRef.current;
    if (!el) return;

    const appWindow = getCurrentWindow();
    let cancelled = false;
    let resizeFrame: number | null = null;
    let resizing = false;
    let pendingResize = false;
    let unlistenScaleChanged: (() => void) | undefined;
    let unlistenPopupShow: (() => void) | undefined;

    /**
     * 用当前显示器 workArea（已排除任务栏）把弹窗夹在右下角。
     * 全部计算都使用 Tauri 返回的物理像素，避免 Win32 DPI 虚拟化混用逻辑/物理坐标。
     */
    const repositionTaskbarPopup = async (): Promise<void> => {
      if (cancelled || appWindow.label !== 'calendar') {
        return;
      }

      try {
        const monitor = await currentMonitor();
        if (!monitor || cancelled) return;

        const outerSize = await appWindow.outerSize();
        const { x, y } = popupPosition(monitor.workArea, outerSize, monitor.scaleFactor);
        await appWindow.setPosition(new PhysicalPosition(Math.round(x), Math.round(y)));
      } catch {
        // 定位失败不阻断日历本身，保留后端初始位置作为兜底。
      }
    };

    const scheduleRepositionTaskbarPopup = (): void => {
      if (appWindow.label !== 'calendar') {
        return;
      }
      if (repositionTaskbarPopupTimerRef.current != null) {
        clearTimeout(repositionTaskbarPopupTimerRef.current);
      }
      repositionTaskbarPopupTimerRef.current = setTimeout(() => {
        repositionTaskbarPopupTimerRef.current = null;
        void repositionTaskbarPopup();
      }, REPOSITION_NEAR_TASKBAR_MS);
    };

    const measureContentLogicalSize = (): { width: number; height: number } => {
      const rect = el.getBoundingClientRect();
      const width = Math.ceil(rect.width);
      const height = Math.ceil(rect.height);
      return { width, height };
    };

    const resizeWindow = async (): Promise<void> => {
      if (cancelled) return;

      const monitor = await currentMonitor();
      if (cancelled) return;
      const limits = monitor ? calendarLimits(monitor.workArea.size, monitor.scaleFactor) : {width:window.screen.availWidth - 24,height:window.screen.availHeight - 24};
      const zoom = Number(getComputedStyle(el).zoom) || 1;
      el.style.setProperty('--calendar-max-width', (limits.width / zoom) + 'px');
      el.style.setProperty('--calendar-max-height', (limits.height / zoom) + 'px');
      const measured = measureContentLogicalSize();
      const desired = {width:Math.min(measured.width,limits.width),height:Math.min(measured.height,limits.height)};
      if (desired.width <= 0 || desired.height <= 100) {
        return;
      }

      let targetWidth = desired.width;
      let targetHeight = desired.height;

      for (let attempt = 0; attempt < MAX_RESIZE_CORRECTIONS; attempt += 1) {
        await appWindow.setSize(new LogicalSize(targetWidth, targetHeight));
        if (cancelled) return;

        // setSize 的 Promise 返回时 Windows/WebView2 仍可能正在提交新 client area，稍等再读。
        await waitForViewportCommit();
        if (cancelled) return;

        // window.innerWidth / innerHeight 与 CSS 内容天然处在同一“逻辑像素”坐标系，
        // 不需要再除 scaleFactor，也不会被不可见的原生边框换算绕进去。
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const widthDeficit = Math.max(0, desired.width - viewportWidth);
        const heightDeficit = Math.max(0, desired.height - viewportHeight);

        if (
          widthDeficit <= VIEWPORT_SIZE_TOLERANCE_PX &&
          heightDeficit <= VIEWPORT_SIZE_TOLERANCE_PX
        ) {
          break;
        }

        targetWidth = Math.min(limits.width, Math.ceil(targetWidth + widthDeficit + 1));
        targetHeight = Math.min(limits.height, Math.ceil(targetHeight + heightDeficit + 1));
      }

      scheduleRepositionTaskbarPopup();
    };

    const scheduleResize = (): void => {
      if (cancelled) return;
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        if (resizing) { pendingResize = true; return; }
        resizing = true;
        void resizeWindow().catch(() => {}).finally(() => {
          resizing = false;
          if (pendingResize && !cancelled) {pendingResize=false;scheduleResize();}
        });
      });
    };

    const observer = new ResizeObserver(() => {
      scheduleResize();
    });

    observer.observe(el);
    scheduleResize();

    // 字体真正就绪后再测一次，避免首帧字体替换后内容增长但窗口仍停留在旧尺寸。
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        scheduleResize();
      });
    }

    // Windows 改分辨率/缩放，或窗口进入不同 DPI 的显示器时，重新按逻辑像素同步尺寸。
    void appWindow
      .onScaleChanged(() => {
        scheduleResize();
      })
      .then((unlisten) => {
        if (cancelled) {
          unlisten();
        } else {
          unlistenScaleChanged = unlisten;
        }
      })
      .catch(() => {});

    // Rust 首次 show 会先按系统任务栏信息给一次位置；显示事件到达时立刻用 Tauri workArea
    // 再夹一次，修正高 DPI 环境里可能出现的右侧/底部越界，且此时前端展开动画尚未完全开始。
    if (appWindow.label === 'calendar') {
      void listen('calendar-popup-show', () => {
        scheduleResize();
      })
        .then((unlisten) => {
          if (cancelled) {
            unlisten();
          } else {
            unlistenPopupShow = unlisten;
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      observer.disconnect();
      unlistenScaleChanged?.();
      unlistenPopupShow?.();
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = null;
      }
      if (repositionTaskbarPopupTimerRef.current != null) {
        clearTimeout(repositionTaskbarPopupTimerRef.current);
        repositionTaskbarPopupTimerRef.current = null;
      }
    };
  }, [autoResizeWindow, scale]);

  return containerRef;
}
