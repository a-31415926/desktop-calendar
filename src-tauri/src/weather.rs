//! Independent weather flyout. Credentials never enter URLs, cache, logs or frontend reads.
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    path::PathBuf,
    sync::atomic::{AtomicBool, Ordering},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

static PINNED: AtomicBool = AtomicBool::new(false);
static WINDOW_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
static FETCH_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Location {
    pub name: String,
    pub description: String,
    pub latitude: f64,
    pub longitude: f64,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub locations: Vec<Location>,
    pub selected: usize,
    pub host: String,
    pub pinned: bool,
}
impl Default for Settings {
    fn default() -> Self {
        Self {
            locations: vec![
                Location { name: "公司 · 静安".into(), description: "大宁德必易园附近（参考坐标）".into(), latitude: 31.2872, longitude: 121.4468 },
                Location { name: "宿舍 · 宝山".into(), description: "宝安公路站附近（参考坐标）".into(), latitude: 31.3714, longitude: 121.4263 },
            ],
            selected: 0,
            host: String::new(),
            pinned: false,
        }
    }
}

fn file(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|_| "无法读取天气配置目录")?;
    std::fs::create_dir_all(&dir).map_err(|_| "无法创建天气配置目录")?;
    Ok(dir.join(name))
}
fn read_settings(app: &AppHandle) -> Settings {
    file(app, "weather-v14.json")
        .ok()
        .and_then(|p| std::fs::read(p).ok())
        .and_then(|b| serde_json::from_slice(&b).ok())
        .filter(|s: &Settings| validate(s).is_ok())
        .unwrap_or_default()
}
fn write_json(app: &AppHandle, name: &str, data: &impl Serialize) -> Result<(), String> {
    let bytes = serde_json::to_vec_pretty(data).map_err(|_| "天气配置序列化失败")?;
    std::fs::write(file(app, name)?, bytes).map_err(|_| "保存天气配置失败".into())
}
fn validate(s: &Settings) -> Result<(), String> {
    if s.locations.is_empty() || s.locations.len() > 2 || s.selected >= s.locations.len() {
        return Err("请设置一至两个地点".into());
    }
    for l in &s.locations {
        if l.name.trim().is_empty()
            || l.name.chars().count() > 16
            || l.description.chars().count() > 80
            || !l.latitude.is_finite()
            || !l.longitude.is_finite()
            || !(-90.0..=90.0).contains(&l.latitude)
            || !(-180.0..=180.0).contains(&l.longitude)
        {
            return Err("请检查地点名称及经纬度".into());
        }
    }
    if !s.host.is_empty() && !valid_host(&s.host) {
        return Err("请粘贴和风控制台中以 .qweatherapi.com 结尾的 API Host，不包含网址路径".into());
    }
    Ok(())
}
fn valid_host(host: &str) -> bool {
    host.len() <= 253
        && host.ends_with(".qweatherapi.com")
        && host.split('.').all(|part| {
            !part.is_empty()
                && part.len() <= 63
                && !part.starts_with('-')
                && !part.ends_with('-')
                && part.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-')
        })
}
fn now() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs()
}

#[cfg(windows)]
fn protect(bytes: &[u8], decrypt: bool) -> Result<Vec<u8>, String> {
    use windows::Win32::{
        Foundation::{LocalFree, HLOCAL},
        Security::Cryptography::{
            CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
        },
    };
    let input =
        CRYPT_INTEGER_BLOB { cbData: bytes.len() as u32, pbData: bytes.as_ptr() as *mut u8 };
    let mut output = CRYPT_INTEGER_BLOB::default();
    unsafe {
        let result = if decrypt {
            CryptUnprotectData(
                &input,
                None,
                None,
                None,
                None,
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output,
            )
        } else {
            CryptProtectData(&input, None, None, None, None, CRYPTPROTECT_UI_FORBIDDEN, &mut output)
        };
        result.map_err(|_| "无法使用当前 Windows 账户保护凭证，请重新输入")?;
        let value = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
        let _ = LocalFree(Some(HLOCAL(output.pbData.cast())));
        Ok(value)
    }
}
#[cfg(not(windows))]
fn protect(_: &[u8], _: bool) -> Result<Vec<u8>, String> {
    Err("本版凭证保存仅支持 Windows".into())
}
fn read_key(app: &AppHandle) -> Result<String, String> {
    let path = file(app, "weather-qweather.bin")?;
    if !path.exists() {
        return Ok(String::new());
    }
    let data = std::fs::read(path).map_err(|_| "读取和风凭证失败")?;
    String::from_utf8(protect(&data, true)?).map_err(|_| "和风凭证无效，请重新输入".into())
}

#[tauri::command]
pub fn weather_settings(app: AppHandle) -> Value {
    json!({"settings": read_settings(&app), "hasKey": read_key(&app).map(|s| !s.is_empty()).unwrap_or(false)})
}
#[tauri::command]
pub async fn weather_save_settings(
    app: AppHandle,
    mut settings: Settings,
    api_key: Option<String>,
) -> Result<Value, String> {
    let _guard = FETCH_LOCK.lock().await;
    settings.host =
        settings.host.trim().trim_start_matches("https://").trim_end_matches('/').to_lowercase();
    validate(&settings)?;
    if let Some(key) = api_key {
        let key = key.trim();
        if key.len() > 512 || !key.bytes().all(|c| c.is_ascii_graphic()) {
            return Err("API Key 格式不正确".into());
        }
        let path = file(&app, "weather-qweather.bin")?;
        if key.is_empty() {
            if path.exists() {
                std::fs::remove_file(path).map_err(|_| "清除凭证失败")?;
            }
        } else {
            std::fs::write(path, protect(key.as_bytes(), false)?)
                .map_err(|_| "保存加密凭证失败")?;
        }
    }
    write_json(&app, "weather-v14.json", &settings)?;
    PINNED.store(settings.pinned, Ordering::Relaxed);
    if let Some(w) = app.get_webview_window("weather") {
        let _ = w.set_always_on_top(!settings.pinned);
    }
    let _ = app.emit("weather-settings-changed", ());
    Ok(weather_settings(app))
}

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Cache {
    key: String,
    forecast: Option<Value>,
    forecast_fetched_at: u64,
    minutely: Option<Value>,
    minutely_fetched_at: u64,
    #[serde(default)]
    forecast_attempt: u64,
    #[serde(default)]
    rain_attempt: u64,
    #[serde(default)]
    forecast_error: Option<String>,
    #[serde(default)]
    rain_error: Option<String>,
}
fn cache_key(l: &Location, host: &str) -> String {
    format!("{:.4},{:.4}|{}", l.latitude, l.longitude, host)
}
fn fresh(time: u64, ttl: u64) -> bool {
    time > 0 && time <= now() + 60 && now().saturating_sub(time) < ttl
}
async fn get_json(request: reqwest::RequestBuilder) -> Result<Value, String> {
    let response = request.send().await.map_err(|_| "连接天气服务失败，请检查网络")?;
    let status = response.status();
    if !status.is_success() {
        return Err(match status.as_u16() {
            401 | 403 => "凭证或接口权限不可用，请检查和风设置".into(),
            429 => "请求达到限额，请稍后刷新".into(),
            _ => format!("天气服务暂不可用（{}）", status.as_u16()),
        });
    }
    response.json().await.map_err(|_| "天气服务返回了无法识别的数据".into())
}
fn valid_forecast(v: &Value) -> bool {
    v["current"]["temperature_2m"].is_number()
        && v["hourly"]["time"].is_array()
        && v["daily"]["time"].is_array()
}
fn valid_rain(v: &Value) -> bool {
    v["code"] == "200"
        && v["minutely"].as_array().is_some_and(|a| {
            !a.is_empty()
                && a.iter().all(|p| {
                    p["fxTime"].as_str().is_some()
                        && p["precip"]
                            .as_str()
                            .and_then(|n| n.parse::<f64>().ok())
                            .is_some_and(|n| n.is_finite() && n >= 0.0)
                })
        })
}

#[tauri::command]
pub async fn weather_fetch(app: AppHandle, index: usize, force: bool) -> Result<Value, String> {
    let _guard = FETCH_LOCK.lock().await;
    let settings = read_settings(&app);
    let location = settings.locations.get(index).ok_or("地点不存在")?;
    let key = cache_key(location, &settings.host);
    let mut caches: Vec<Cache> = file(&app, "weather-v14-cache.json")
        .ok()
        .and_then(|p| std::fs::read(p).ok())
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_default();
    let mut cache = caches
        .iter()
        .find(|c| c.key == key)
        .cloned()
        .unwrap_or_else(|| Cache { key: key.clone(), ..Default::default() });
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(12))
        .redirect(reqwest::redirect::Policy::none())
        .user_agent("DesktopCalendar/1.1.0")
        .build()
        .map_err(|_| "无法初始化天气连接")?;
    if !fresh(cache.forecast_attempt, 60) && (force || !fresh(cache.forecast_fetched_at, 1800)) {
        cache.forecast_attempt = now();
        let result = get_json(client.get("https://api.open-meteo.com/v1/forecast").query(&[
            ("latitude", location.latitude.to_string()), ("longitude", location.longitude.to_string()),
            ("current", "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day".into()),
            ("hourly", "temperature_2m,precipitation_probability,precipitation,weather_code".into()),
            ("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset".into()),
            ("timezone", "Asia/Shanghai".into()), ("forecast_days", "3".into())
        ])).await;
        match result {
            Ok(v) if valid_forecast(&v) => {
                cache.forecast = Some(v);
                cache.forecast_fetched_at = now();
                cache.forecast_error = None;
            }
            Ok(_) => cache.forecast_error = Some("基础天气数据不完整".into()),
            Err(e) => cache.forecast_error = Some(e),
        }
    }
    let secret = read_key(&app);
    let configured = !settings.host.is_empty() && secret.as_ref().is_ok_and(|s| !s.is_empty());
    if configured
        && !fresh(cache.rain_attempt, 60)
        && (force || !fresh(cache.minutely_fetched_at, 600))
    {
        cache.rain_attempt = now();
        let result = get_json(
            client
                .get(format!("https://{}/v7/minutely/5m", settings.host))
                .header("X-QW-Api-Key", secret.as_ref().unwrap())
                .query(&[
                    ("location", format!("{:.2},{:.2}", location.longitude, location.latitude)),
                    ("lang", "zh".into()),
                ]),
        )
        .await;
        match result {
            Ok(v) if valid_rain(&v) => {
                cache.minutely = Some(v);
                cache.minutely_fetched_at = now();
                cache.rain_error = None;
            }
            Ok(_) => {
                cache.rain_error = Some("和风未返回降雨预报，请检查接口权限、额度及位置".into())
            }
            Err(e) => cache.rain_error = Some(e),
        }
    }
    if !configured {
        cache.minutely = None;
        cache.minutely_fetched_at = 0;
        cache.rain_error = secret.err();
    }
    caches.retain(|c| {
        c.key != key && settings.locations.iter().any(|l| cache_key(l, &settings.host) == c.key)
    });
    caches.push(cache.clone());
    let save_error = write_json(&app, "weather-v14-cache.json", &caches).err();
    let result = json!({"location": location, "forecast": cache.forecast, "forecastFetchedAt": cache.forecast_fetched_at, "minutely": cache.minutely, "minutelyFetchedAt": cache.minutely_fetched_at, "forecastError": cache.forecast_error, "rainError": cache.rain_error, "saveError": save_error, "qweatherConfigured": configured});
    let _ = app.emit("weather-data-changed", ());
    Ok(result)
}

pub fn open(app: &AppHandle) -> Result<(), String> {
    let _window_guard = WINDOW_LOCK.lock().map_err(|_| "天气窗口忙碌，请重试")?;
    let settings = read_settings(app);
    PINNED.store(settings.pinned, Ordering::Relaxed);
    let window = if let Some(w) = app.get_webview_window("weather") {
        w
    } else {
        let w = WebviewWindowBuilder::new(
            app,
            "weather",
            WebviewUrl::App("index.html?window=weather".into()),
        )
        .title("桌面日历 · 天气")
        .inner_size(380.0, 780.0)
        .decorations(false)
        .resizable(false)
        .skip_taskbar(true)
        .always_on_top(!settings.pinned)
        .visible(false)
        .build()
        .map_err(|_| "创建天气窗口失败")?;
        let handle = w.clone();
        w.on_window_event(move |e| match e {
            tauri::WindowEvent::Focused(false) if !PINNED.load(Ordering::Relaxed) => {
                let _ = handle.hide();
            }
            tauri::WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = handle.hide();
            }
            _ => {}
        });
        w
    };
    // Use the current monitor's work area, respecting taskbars, negative origins and DPI.
    let monitor = app
        .get_webview_window("popup")
        .and_then(|w| w.current_monitor().ok().flatten())
        .or_else(|| window.current_monitor().ok().flatten())
        .or_else(|| app.primary_monitor().ok().flatten());
    if let Some(m) = monitor {
        let area = m.work_area();
        let scale = m.scale_factor();
        let height = (area.size.height as f64 / scale - 24.0).min(800.0).max(320.0);
        let width = (area.size.width as f64 / scale - 24.0).min(380.0).max(280.0);
        let _ = window.set_size(tauri::LogicalSize::new(width, height));
        let _ = window.set_position(tauri::PhysicalPosition::new(
            area.position.x + (12.0 * scale) as i32,
            area.position.y + (12.0 * scale) as i32,
        ));
    }
    window.show().map_err(|_| "显示天气窗口失败")?;
    let _ = window.set_focus();
    let _ = window.emit("weather-opened", ());
    Ok(())
}
#[tauri::command]
pub async fn open_weather(app: AppHandle) -> Result<(), String> {
    // WebView2 creation must not block a synchronous event handler.
    tauri::async_runtime::spawn_blocking(move || open(&app))
        .await
        .map_err(|_| "无法打开天气窗口".to_string())?
}

pub fn request_open(app: &AppHandle) {
    let handle = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _ = open(&handle);
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn restrict_credential_destinations() {
        assert!(valid_host("abc.xy.qweatherapi.com"));
        for host in [
            "evil.com",
            "a.qweatherapi.com.evil.com",
            "a.qweatherapi.com@evil.com",
            "a.qweatherapi.com/path",
            "a..qweatherapi.com",
            "https://a.qweatherapi.com",
        ] {
            assert!(!valid_host(host));
        }
    }
    #[test]
    fn invalid_coordinates_and_selection_are_rejected() {
        let mut s = Settings::default();
        s.locations[0].latitude = f64::NAN;
        assert!(validate(&s).is_err());
        s.locations[0].latitude = 91.0;
        assert!(validate(&s).is_err());
        s.locations[0].latitude = 31.0;
        s.selected = 2;
        assert!(validate(&s).is_err());
    }
    #[test]
    fn reject_empty_or_invalid_rain() {
        assert!(!valid_rain(&json!({"code":"200","minutely":[]})));
        assert!(!valid_rain(
            &json!({"code":"200","minutely":[{"fxTime":"2026-10-19T10:00+08:00","precip":"-1"}]})
        ));
        assert!(valid_rain(
            &json!({"code":"200","minutely":[{"fxTime":"2026-10-19T10:00+08:00","precip":"0.1"}]})
        ));
    }
    #[test]
    fn cache_cannot_leak_between_locations_or_hosts() {
        let mut l = Settings::default().locations.remove(0);
        let a = cache_key(&l, "a.qweatherapi.com");
        l.latitude += 0.1;
        assert_ne!(a, cache_key(&l, "a.qweatherapi.com"));
        assert_ne!(a, cache_key(&l, "b.qweatherapi.com"));
        assert!(!fresh(0, 600));
    }
    #[cfg(windows)]
    #[test]
    fn credentials_round_trip_with_windows_protection() {
        let key = b"test-not-a-real-secret";
        let encrypted = protect(key, false).unwrap();
        assert_ne!(encrypted, key);
        assert_eq!(protect(&encrypted, true).unwrap(), key);
    }
}
