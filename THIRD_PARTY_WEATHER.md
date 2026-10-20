# Weather module acknowledgements

The WMO weather-code mapping in src/weather/model.ts is adapted from LuckyIsland,
https://github.com/thisxiaoyuQAQ/LuckyIsland at c9e9b412dbd8d136fc0f733cd1366415ed4f95a1,
src-tauri/src/data/weather/open_meteo.rs. Its multi-location/cache design was reviewed as reference.
The sidebar, existing-calendar integration and QWeather adapter are implemented for this project.
No GPL application code is incorporated. This notice does not change the license status of the original calendar.

Default weather data: QWeather (current weather, hourly and daily forecast via weather/v1;
optional two-hour precipitation via v7/minutely/5m), subject to QWeather terms and account permissions.
Users supply their own API Host and API Key in settings. No credentials are distributed.
Open-Meteo (CC BY 4.0) remains an explicitly selectable alternative; it is never a silent fallback.
Attribution is also displayed inside the weather panel.

QWeather documentation: https://dev.qweather.com/docs/api/weather/weather-current/
and https://dev.qweather.com/docs/configuration/authentication/ .
API Key authentication is supported; QWeather announces daily request restrictions from 2027-01-01.

MIT License

Copyright (c) 2026 thisxiaoyuQAQ

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
