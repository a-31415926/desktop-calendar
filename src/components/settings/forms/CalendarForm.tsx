import { Form, Switch } from 'antd';
import { useConfigSync } from '../../../sync/configStore.ts';
const items = [ ['lunarVisible','显示农历与节气'], ['calendarWeatherVisible','日期格显示天气'],
 ['calendarFooterVisible','显示底部信息区域'], ['footerFestivalVisible','底部显示节假日'],
 ['footerYiJiVisible','显示宜忌'], ['footerCountdownVisible','显示节日倒计时'] ] as const;
export default function CalendarForm(){const {data:c,sync}=useConfigSync();return <Form layout="vertical" style={{maxWidth:540}}><h2>日历内容</h2><p className="settings-description">开关立即应用到日历，重新启动后保留。</p>{items.map(([key,label])=><Form.Item key={key} label={label}><Switch checked={c[key]} disabled={key.startsWith('footer')&&!c.calendarFooterVisible} onChange={v=>void sync(key,v)}/></Form.Item>)}</Form>;}
