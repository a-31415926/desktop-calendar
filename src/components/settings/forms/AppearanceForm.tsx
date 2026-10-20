import { Button, Form, Segmented, Slider, Switch } from 'antd';
import { useConfigSync } from '../../../sync/configStore.ts';
export default function AppearanceForm() {
 const {data:c,sync}=useConfigSync();
 return <Form layout="vertical" style={{maxWidth:540}}>
  <h2>外观与大小</h2><p className="settings-description">调整立即应用到日历。这台电脑单独保存自己的大小。</p>
  <Form.Item label={'整体缩放 · '+c.calendarScale+'%'}><Slider min={55} max={110} step={1} value={c.calendarScale} onChange={v=>void sync('calendarScale',v)} marks={{55:'55%',85:'舒适 · 85%',100:'100%'}} /></Form.Item>
  <p className="settings-description">建议先试 85% 窗口、110% 文字。支持每次微调 1%，也可以收起天气详情，减少占屏。</p>
  <Form.Item label={'文字大小 · '+c.calendarTextScale+'%'}><Slider min={90} max={115} step={5} value={c.calendarTextScale} onChange={v=>void sync('calendarTextScale',v)} marks={{90:'较小',100:'标准',115:'较大'}} /></Form.Item>
  <Form.Item label="精简天气栏"><Switch checked={c.calendarCompact} onChange={v=>void sync('calendarCompact',v)} /><span className="settings-inline-hint"> 隐藏空气质量、紫外线与逐小时预报，保留天气和重要提醒</span></Form.Item>
  <Form.Item label="日历主题"><Segmented value={c.theme} options={[{label:'浅色',value:'light'},{label:'深色',value:'dark'}]} onChange={v=>void sync('theme',v)} /></Form.Item>
  <Form.Item label={'背景不透明度 · '+c.calendarSurfaceOpacity+'%'}><Slider min={35} max={100} step={5} value={c.calendarSurfaceOpacity} onChange={v=>void sync('calendarSurfaceOpacity',v)} /></Form.Item>
  <Form.Item label="固定日历窗口"><Switch checked={c.calendarPinned} onChange={v=>void sync('calendarPinned',v)} /></Form.Item>
  <Button onClick={()=>void sync({calendarScale:85,calendarTextScale:110,calendarCompact:false,calendarSurfaceOpacity:100,theme:'light'})}>恢复推荐外观</Button>
 </Form>;
}
