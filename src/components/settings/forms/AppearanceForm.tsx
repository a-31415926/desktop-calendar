import { Button, Form, Segmented, Slider, Switch } from 'antd';
import { useConfigSync } from '../../../sync/configStore.ts';
export default function AppearanceForm() {
 const {data:c,sync}=useConfigSync();
 return <Form layout="vertical" style={{maxWidth:540}}>
  <h2>外观与大小</h2><p className="settings-description">调整立即应用到日历。这台电脑单独保存自己的大小。</p>
  <Form.Item label={'整体缩放 · '+c.calendarScale+'%'}><Slider min={55} max={110} step={5} value={c.calendarScale} onChange={v=>void sync('calendarScale',v)} marks={{55:'55%',75:'75%',100:'原始大小'}} /></Form.Item>
  <p className="settings-description">27 寸 2K 屏幕建议从 75% 开始。窗口、天气、图标和间距一起缩放。</p>
  <Form.Item label={'文字大小 · '+c.calendarTextScale+'%'}><Slider min={90} max={115} step={5} value={c.calendarTextScale} onChange={v=>void sync('calendarTextScale',v)} marks={{90:'较小',100:'标准',115:'较大'}} /></Form.Item>
  <Form.Item label="日历主题"><Segmented value={c.theme} options={[{label:'浅色',value:'light'},{label:'深色',value:'dark'}]} onChange={v=>void sync('theme',v)} /></Form.Item>
  <Form.Item label={'背景不透明度 · '+c.calendarSurfaceOpacity+'%'}><Slider min={35} max={100} step={5} value={c.calendarSurfaceOpacity} onChange={v=>void sync('calendarSurfaceOpacity',v)} /></Form.Item>
  <Form.Item label="固定日历窗口"><Switch checked={c.calendarPinned} onChange={v=>void sync('calendarPinned',v)} /></Form.Item>
  <Button onClick={()=>void sync({calendarScale:75,calendarTextScale:100,calendarSurfaceOpacity:100,theme:'light'})}>恢复推荐外观</Button>
 </Form>;
}
