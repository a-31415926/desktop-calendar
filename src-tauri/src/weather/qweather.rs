//! QWeather weather/v1 adapter. Units and fractional probabilities follow the official API.
use super::{get_json, Location, Settings};
use serde_json::{json, Value};

fn numeric(v: &Value) -> Option<f64> {
    v.as_f64().or_else(|| v.as_str()?.parse().ok()).filter(|n| n.is_finite())
}
fn scaled(v: &Value, scale: f64) -> Value {
    numeric(v).map(|n| json!(n * scale)).unwrap_or(Value::Null)
}
fn code(v: &Value) -> i64 {
    numeric(v).map(|n| n as i64).unwrap_or(-1)
}
fn column(rows: &[Value], field: impl Fn(&Value) -> Value) -> Value {
    Value::Array(rows.iter().map(field).collect())
}

pub(super) fn normalize(current: &Value, hourly: &Value, daily: &Value) -> Result<Value, String> {
    let hours = hourly["hours"]
        .as_array()
        .filter(|a| !a.is_empty())
        .ok_or("和风小时预报为空或格式不完整")?;
    let days =
        daily["days"].as_array().filter(|a| !a.is_empty()).ok_or("和风多日预报为空或格式不完整")?;
    if numeric(&current["temperature"]["value"]).is_none()
        || code(&current["condition"]["code"]) < 0
        || hours.iter().any(|h| {
            h["forecastTime"].as_str().is_none()
                || numeric(&h["temperature"]["value"]).is_none()
                || code(&h["condition"]["code"]) < 0
        })
        || days.iter().any(|d| {
            d["forecastStartTime"].as_str().is_none()
                || numeric(&d["temperatureMax"]["value"]).is_none()
                || numeric(&d["temperatureMin"]["value"]).is_none()
                || code(&d["daytime"]["condition"]["code"]) < 0
        })
    {
        return Err("和风天气返回的数据不完整，请稍后刷新".into());
    }
    // Request localTime=true. Daily dates use solarNoon's local date; the period
    // itself can begin at 06:00 or 22:00 and must not determine the calendar day.
    let date = |d: &Value| -> String {
        d["astro"]["solarNoon"]
            .as_str()
            .or_else(|| d["astro"]["sunrise"].as_str())
            .or_else(|| d["daytime"]["forecastStartTime"].as_str())
            .unwrap_or("")
            .get(..10)
            .unwrap_or("")
            .to_string()
    };
    if days.iter().any(|d| date(d).len() != 10) {
        return Err("和风多日预报缺少日期信息".into());
    }
    let attrs: Vec<String> = [current, hourly, daily]
        .iter()
        .flat_map(|v| {
            v["metadata"]["attributions"]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
                .map(str::to_owned)
        })
        .collect();
    Ok(json!({
        "attributions": attrs,
        "current": {
            "time": "", "temperature_2m": scaled(&current["temperature"]["value"], 1.0),
            "apparent_temperature": scaled(&current["feelsLike"]["value"], 1.0),
            "relative_humidity_2m": scaled(&current["humidity"], 100.0),
            "weather_code": code(&current["condition"]["code"]),
            "wind_speed_10m": scaled(&current["wind"]["speed"]["value"], if current["wind"]["speed"]["unit"] == "m/s" {3.6} else {1.0}),
            "is_day": -1
        },
        "hourly": {
            "time": column(hours, |h| h["forecastTime"].clone()),
            "temperature_2m": column(hours, |h| scaled(&h["temperature"]["value"], 1.0)),
            "precipitation_probability": column(hours, |h| scaled(&h["precipitation"]["probability"], 100.0)),
            "precipitation": column(hours, |h| scaled(&h["precipitation"]["amount"]["value"], 1.0)),
            "weather_code": column(hours, |h| json!(code(&h["condition"]["code"])))
        },
        "daily": {
            "time": column(days, |d| json!(date(d))),
            "weather_code": column(days, |d| json!(code(&d["daytime"]["condition"]["code"]))),
            "temperature_2m_max": column(days, |d| scaled(&d["temperatureMax"]["value"], 1.0)),
            "temperature_2m_min": column(days, |d| scaled(&d["temperatureMin"]["value"], 1.0)),
            "precipitation_probability_max": column(days, |d| {
                let a = numeric(&d["daytime"]["precipitation"]["probability"]);
                let b = numeric(&d["nighttime"]["precipitation"]["probability"]);
                match (a,b) { (Some(a),Some(b)) => json!(a.max(b)*100.0), _ => Value::Null }
            }),
            "sunrise": column(days, |d| json!(d["astro"]["sunrise"].as_str().unwrap_or(""))),
            "sunset": column(days, |d| json!(d["astro"]["sunset"].as_str().unwrap_or("")))
        }
    }))
}

pub(super) async fn fetch(
    client: &reqwest::Client,
    settings: &Settings,
    location: &Location,
    secret: &str,
) -> Result<Value, String> {
    let endpoint = |kind: &str| {
        format!(
            "https://{}/weather/v1/{}/{:.2}/{:.2}",
            settings.host, kind, location.latitude, location.longitude
        )
    };
    let request = |kind: &str| {
        client
            .get(endpoint(kind))
            .header("X-QW-Api-Key", secret)
            .query(&[("localTime", "true"), ("lang", "zh")])
    };
    let current = get_json(request("current")).await?;
    let hourly = get_json(request("hourly").query(&[("hours", "24")])).await?;
    let daily = get_json(request("daily").query(&[("days", "7")])).await?;
    normalize(&current, &hourly, &daily)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn v1_units_dates_and_missing_values_are_preserved() {
        let c = json!({"temperature":{"value":21.5},"condition":{"code":"305"},"humidity":0.7,"wind":{"speed":{"value":2,"unit":"m/s"}}});
        let h = json!({"hours":[{"forecastTime":"2026-10-20T09:00+08:00","temperature":{"value":22},"condition":{"code":"306"},"precipitation":{"probability":0.65}}]});
        let d = json!({"days":[{"forecastStartTime":"2026-10-19T22:00+08:00","astro":{"solarNoon":"2026-10-20T12:00+08:00"},"temperatureMax":{"value":25},"temperatureMin":{"value":17},"daytime":{"condition":{"code":"307"},"precipitation":{"probability":0.8}},"nighttime":{"precipitation":{"probability":0.2}}}]});
        let v = normalize(&c, &h, &d).unwrap();
        assert_eq!(v["daily"]["time"][0], "2026-10-20");
        assert_eq!(v["hourly"]["precipitation_probability"][0], 65.0);
        assert_eq!(v["daily"]["precipitation_probability_max"][0], 80.0);
        assert_eq!(v["current"]["relative_humidity_2m"], 70.0);
        assert_eq!(v["current"]["wind_speed_10m"], 7.2);
        assert!(v["current"]["apparent_temperature"].is_null());
        assert!(normalize(&json!({}), &h, &d).is_err());
        assert!(normalize(&c, &json!({"hours":[]}), &d).is_err());
    }
}
