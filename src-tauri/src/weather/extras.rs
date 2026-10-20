//! Optional services have separate cache ages, retry gates and failures.
use super::{fresh, get_json, now, Location, Settings};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(super) struct Entry {
    pub value: Option<Value>,
    pub fetched_at: u64,
    attempt: u64,
    pub error: Option<String>,
}
#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(super) struct Extras {
    pub air: Entry,
    pub alerts: Entry,
    pub indices: Entry,
}
fn valid(kind: &str, data: &Value) -> bool {
    match kind {
        "air" => data["indexes"]
            .as_array()
            .is_some_and(|a| !a.is_empty() && a.iter().any(|i| i["aqi"].is_number())),
        "alerts" => data["alerts"].is_array() || data["metadata"]["zeroResult"] == true,
        "indices" => data["code"] == "200" && data["daily"].is_array(),
        _ => false,
    }
}
impl Extras {
    pub(super) async fn refresh(
        &mut self,
        client: &reqwest::Client,
        settings: &Settings,
        location: &Location,
        secret: &str,
        force: bool,
    ) {
        let coordinates = format!("{:.2}/{:.2}", location.latitude, location.longitude);
        let jobs = [
            ("air", format!("/airquality/v1/current/{coordinates}?lang=zh"), 1800, &mut self.air),
            (
                "alerts",
                format!("/weatheralert/v1/current/{coordinates}?localTime=true&lang=zh"),
                600,
                &mut self.alerts,
            ),
            (
                "indices",
                format!(
                    "/v7/indices/1d?location={:.2},{:.2}&type=1,3,5&lang=zh",
                    location.longitude, location.latitude
                ),
                10800,
                &mut self.indices,
            ),
        ];
        for (kind, path, ttl, entry) in jobs {
            if fresh(entry.attempt, 60) || (!force && fresh(entry.fetched_at, ttl)) {
                continue;
            }
            entry.attempt = now();
            match get_json(
                client
                    .get(format!("https://{}{}", settings.host, path))
                    .header("X-QW-Api-Key", secret),
            )
            .await
            {
                Ok(v) if valid(kind, &v) => {
                    entry.value = Some(v);
                    entry.fetched_at = now();
                    entry.error = None;
                }
                Ok(_) => entry.error = Some("接口未返回有效数据，请检查服务权限与位置".into()),
                Err(e) => entry.error = Some(e),
            }
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn no_warning_and_no_permission_are_different() {
        assert!(valid("alerts", &json!({"metadata":{"zeroResult":true}})));
        assert!(valid("alerts", &json!({"alerts":[]})));
        assert!(!valid("alerts", &json!({"code":"403"})));
        assert!(valid("air", &json!({"indexes":[{"code":"cn-mee","aqi":0}]})));
        assert!(!valid("air", &json!({"indexes":[]})));
        assert!(!valid("indices", &json!({"code":"403","daily":[]})));
    }
    #[test]
    fn old_cache_deserializes_without_optional_services() {
        let e: Extras = serde_json::from_value(json!({})).unwrap();
        assert!(e.air.value.is_none());
        assert_eq!(e.alerts.fetched_at, 0);
        assert!(e.indices.error.is_none());
    }
}
