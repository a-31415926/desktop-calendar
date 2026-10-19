use serde::Deserialize;
use std::fs;
use tauri::{AppHandle, Manager};

/// 桌面组件窗口的持久化位置（物理像素坐标）。
#[cfg(windows)]
#[derive(Default, Deserialize, Clone)]
pub struct PersistedPosition {
    pub x: i32,
    pub y: i32,
}

/// 自 `liConfig.json` 反序列化的功能开关快照。
#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistedFeatureConfig {
    /// 是否启用桌面日历小组件（仅 Windows）。
    #[cfg(windows)]
    pub desktop_widget_enabled: Option<bool>,
    /// 是否启用任务栏日历替换/拦截（仅 Windows）。
    #[cfg(windows)]
    pub taskbar_widget_enabled: Option<bool>,
    /// 桌面日历小组件上次保存的物理像素位置（仅 Windows）。
    #[cfg(windows)]
    pub desktop_window_position: Option<PersistedPosition>,
    /// 菜单栏标题模板字符串（仅 macOS）。
    #[cfg(target_os = "macos")]
    pub macos_tray_title_template: Option<String>,
    /// 菜单栏日期图标样式配置键（仅 macOS）。
    #[cfg(target_os = "macos")]
    pub macos_tray_date_icon_style: Option<String>,
    /// 托盘图标宽度像素（仅 macOS）。
    #[cfg(target_os = "macos")]
    pub macos_tray_icon_width: Option<u32>,
    /// 托盘图标高度像素（仅 macOS）。
    #[cfg(target_os = "macos")]
    pub macos_tray_icon_height: Option<u32>,
    /// 菜单栏主图标类型：`date` / `calendar`（仅 macOS）。
    #[cfg(target_os = "macos")]
    pub macos_tray_bar_icon: Option<String>,
}


#[cfg(windows)]
/// V14.1 首次修复时只读取旧版 V13 设置，不修改旧程序或天气地点配置。
/// 预览版独立 identifier 会建立新的 liConfig.json，所以需要一次性补回用户熟悉的界面和任务栏选项。
pub fn restore_v13_preferences_once(app_handle: &AppHandle) {
    use serde_json::{Map, Value};
    let Ok(dir) = app_handle.path().app_config_dir() else { return };
    if fs::create_dir_all(&dir).is_err() { return; }
    let marker = dir.join("v14-1-restore-v13-v1.done");
    if marker.exists() { return; }
    let dest = dir.join("liConfig.json");
    let mut current = fs::read_to_string(&dest)
        .ok()
        .and_then(|s| serde_json::from_str::<Value>(&s).ok())
        .and_then(|v| v.as_object().cloned())
        .unwrap_or_else(Map::new);
    // V13 唯一原始应用标识；只读同级配置，不触碰其文件。
    let previous = dir.parent()
        .map(|parent| parent.join("pro.softsoft.li-calendar").join("liConfig.json"))
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|s| serde_json::from_str::<Value>(&s).ok());
    let old = previous.as_ref().and_then(Value::as_object);
    // 只同步界面/任务栏偏好。不要导入开机自启、桌面小组件位置或与天气有关的凭证。
    const KEYS: &[&str] = &[
        "theme", "calendarPinned", "calendarFooterVisible", "footerFestivalVisible",
        "footerYiJiVisible", "footerCountdownVisible", "taskbarWidgetEnabled",
        "customTrayClockEnabled", "timeFormat", "dateFormat",
        "frontendWindowEffectEnabled", "frontendWindowTransparency",
    ];
    for key in KEYS {
        if let Some(value) = old.and_then(|v| v.get(*key)) {
            current.insert((*key).into(), value.clone());
        }
    }
    // 从未配置过 V13 的机器也应该默认显示今日宜忌、日期卡和系统时钟入口。
    current.entry("calendarFooterVisible").or_insert(Value::Bool(true));
    current.entry("footerFestivalVisible").or_insert(Value::Bool(true));
    current.entry("footerYiJiVisible").or_insert(Value::Bool(true));
    current.entry("footerCountdownVisible").or_insert(Value::Bool(true));
    current.entry("taskbarWidgetEnabled").or_insert(Value::Bool(true));
    // 上个天气预览默认关闭了两个选项；没有 V13 数据时纠正该已知回归。
    if old.is_none() {
        current.insert("footerYiJiVisible".into(), Value::Bool(true));
        current.insert("calendarFooterVisible".into(), Value::Bool(true));
        current.insert("taskbarWidgetEnabled".into(), Value::Bool(true));
    }
    if dest.exists() {
        let backup = dir.join("liConfig.before-v14-1-repair.json");
        if !backup.exists() && fs::copy(&dest, &backup).is_err() { return; }
    }
    if let Ok(bytes) = serde_json::to_vec_pretty(&Value::Object(current)) {
        if fs::write(&dest, bytes).is_ok() {
            let _ = fs::write(marker, b"restored");
        }
    }
}

/// 从应用配置目录加载持久化功能开关，读取失败时返回默认配置。
pub fn load_persisted_feature_config(app_handle: &AppHandle) -> PersistedFeatureConfig {
    let Some(config_dir) = app_handle.path().app_config_dir().ok() else {
        return PersistedFeatureConfig::default();
    };
    let config_path = config_dir.join("liConfig.json");
    let Ok(content) = fs::read_to_string(config_path) else {
        return PersistedFeatureConfig::default();
    };
    serde_json::from_str::<PersistedFeatureConfig>(&content).unwrap_or_default()
}
