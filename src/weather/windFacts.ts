// GB/T 28591-2012, 10 m wind speed. Convert the API's km/h to rounded 0.1 m/s.
const lowerBounds=[0,0.3,1.6,3.4,5.5,8,10.8,13.9,17.2,20.8,24.5,28.5,32.7,37,41.5,46.2,51,56.1];
const validSpeed=(speed:number|null|undefined)=>speed!=null&&Number.isFinite(speed)&&speed>=0;
export function windLevel(speed:number|null|undefined) {
 if(!validSpeed(speed))return null;
 const ms=Math.round(speed!/3.6*10)/10;
 return lowerBounds.reduce((level,bound,index)=>ms>=bound?index:level,0);
}
const observations=[
 '烟直上，树叶不动','烟随风偏','树叶微动，有风感',
 '树叶和细枝摇动','纸片吹起，树枝摇动','小树摇摆，水面起波',
 '大树枝摇动','迎风行走费力',
 '行走困难，树枝易折',
];
export function windFacts(speed:number|null|undefined,scale?:number|null,direction?:number|null) {
 const level=scale!=null&&Number.isInteger(scale)&&scale>=0&&scale<=17?scale:windLevel(speed);
 const compass=direction!=null&&Number.isFinite(direction)&&direction>=0&&direction<360
  ?['北','东北','东','东南','南','西南','西','西北'][Math.round(direction/45)%8]+'风':null;
 const observation=level==null?'风况数据暂缺':observations[level]??'强风可能造成损坏';
 const advice=level==null?'':level<=3?'出行影响通常较小':level<=5?'留意扬尘和迎风骑行':level<=7?'撑伞困难，骑车留意':'减少外出，留意预警';
 return {level,direction:compass,speed:validSpeed(speed)?speed!:null,observation,advice,
  risk:level==null?'unknown':level<6?'normal':level<8?'attention':'high'};
}
