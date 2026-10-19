//! 系统托盘右键菜单：设置与退出。
use tauri::menu::{Menu, MenuItem};
use tauri::{AppHandle, Wry};

use crate::menu::{MENU_EXIT, MENU_SETTINGS};

/// 构建系统托盘右键菜单。
///
/// * `app_handle` - 应用程序句柄
pub fn build_tray_menu(app_handle: &AppHandle) -> Result<Menu<Wry>, tauri::Error> {
    // 托盘菜单中的“设置”菜单项。
    let settings_item = MenuItem::with_id(app_handle, MENU_SETTINGS, "设置", true, None::<&str>)?;
    // 托盘菜单中的“退出”菜单项。
    let exit_item = MenuItem::with_id(app_handle, MENU_EXIT, "退出", true, None::<&str>)?;

    // 组装托盘菜单。
    let weather_item = MenuItem::with_id(app_handle, crate::menu::MENU_WEATHER, "天气 · 左侧面板", true, None::<&str>)?;
    Menu::with_items(app_handle, &[&weather_item, &settings_item, &exit_item])
}
