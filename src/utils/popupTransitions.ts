type After = 'open-main' | undefined;
interface Effects {
  visible:(value:boolean)=>void;
  schedule:(callback:()=>void,ms:number)=>unknown;
  cancel:(handle:unknown)=>void;
  requestClose:(epoch:number)=>Promise<unknown>;
  finishHide:(epoch:number)=>Promise<boolean>;
  afterHide:(epoch:number)=>Promise<unknown>;
  error:(error:unknown)=>void;
}
/** Late native events and expired animation timers belong to their own opening. */
export function popupTransitions(effects:Effects) {
  let epoch=0, wanted=false, timer:unknown, after:After;
  const clear=()=>{if(timer!==undefined){effects.cancel(timer);timer=undefined;}};
  return {
    enter(next:number) {
      if(next<epoch)return;
      epoch=next;wanted=true;after=undefined;clear();
      // Always restore the rendered surface. Native and renderer visibility can drift.
      effects.visible(true);
    },
    exit(next:number,then?:After) {
      if(next<epoch)return;
      if(next===epoch&&!wanted&&timer!==undefined){after=then??after;return;}
      epoch=next;wanted=false;after=then??after;clear();effects.visible(false);
      void effects.requestClose(next).catch(effects.error);
      timer=effects.schedule(()=>{
        timer=undefined;
        if(wanted||epoch!==next)return;
        void effects.finishHide(next).then(async hidden=>{
          if(hidden&&!wanted&&epoch===next&&after==='open-main'){
            after=undefined;await effects.afterHide(next);
          }
        }).catch(effects.error);
      },167);
    },
    current:()=>epoch,
    dispose:clear,
  };
}

