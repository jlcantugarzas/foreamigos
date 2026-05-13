import { useState, useEffect, useCallback } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, collection, setDoc, getDoc, onSnapshot, writeBatch, getDocs } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCIy20mTLpPQTYnRCI75pCja9NAK2Rmj3o",
  authDomain: "foreamigos-1c459.firebaseapp.com",
  projectId: "foreamigos-1c459",
  storageBucket: "foreamigos-1c459.firebasestorage.app",
  messagingSenderId: "1062407731886",
  appId: "1:1062407731886:web:a74c2cb18e120d88f4cb3f"
};

const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
const auth = getAuth(app);
const ADMIN_PIN = "1234";

const DEMO_PLAYERS = [
  { id:"p1", name:"Alex",   handicap:5,  pin:"1111", initials:"AX", color:"#1a6b3c" },
  { id:"p2", name:"Brian",  handicap:8,  pin:"2222", initials:"BR", color:"#2563eb" },
  { id:"p3", name:"Carlos", handicap:10, pin:"3333", initials:"CA", color:"#7c3aed" },
  { id:"p4", name:"Diana",  handicap:12, pin:"4444", initials:"DI", color:"#db2777" },
  { id:"p5", name:"Elena",  handicap:15, pin:"5555", initials:"EL", color:"#d97706" },
  { id:"p6", name:"Frank",  handicap:18, pin:"6666", initials:"FR", color:"#059669" },
  { id:"p7", name:"Grace",  handicap:20, pin:"7777", initials:"GR", color:"#dc2626" },
  { id:"p8", name:"Hugo",   handicap:25, pin:"8888", initials:"HU", color:"#0891b2" },
  { id:"p9", name:"Iris",   handicap:30, pin:"9999", initials:"IR", color:"#65a30d" },
];
const DEMO_COURSE = { name:"Pines Golf Club", holes:9, pars:[4,3,5,4,4,3,5,4,4], strokeIndex:[3,7,1,5,9,8,2,4,6] };

function generateTeams(players) {
  const sorted=[...players].sort((a,b)=>a.handicap-b.handicap);
  const teams=[[],[],[]];
  sorted.forEach((p,i)=>{ const r=Math.floor(i/3),pos=i%3; teams[r%2===0?pos:2-pos].push(p); });
  return teams.map((m,i)=>({ id:"t"+(i+1), name:["Team Eagle","Team Birdie","Team Par"][i], color:["#1a6b3c","#2563eb","#7c3aed"][i], members:m.map(p=>p.id), avgHcp:m.length?Math.round(m.reduce((s,p)=>s+p.handicap,0)/m.length):0 }));
}

function calcHandicapStrokes(playerHcp,lowestHcp,strokeIndexes,totalHoles) {
  const diff=playerHcp-lowestHcp;
  return strokeIndexes.map(si=>{ let s=Math.floor(diff/totalHoles); if(si<=(diff%totalHoles))s++; return s; });
}

function calcStableford(gross,par,strokes) {
  if(gross===null||gross===undefined||gross==="")return null;
  const g=parseInt(gross); if(isNaN(g))return null;
  const net=Math.min(g,par+2)-strokes,diff=par-net;
  if(diff>=2)return 4; if(diff===1)return 3; if(diff===0)return 2; if(diff===-1)return 1; return 0;
}

function getTotalStats(player,scores,course,allPlayers) {
  if(!course||!scores)return{totalGross:0,stableford:0,quota:0,quotaPos:0,holesPlayed:0};
  const lowestHcp=allPlayers?.length?Math.min(...allPlayers.map(p=>p.handicap)):player.handicap;
  const strokes=calcHandicapStrokes(player.handicap,lowestHcp,course.strokeIndex,course.holes);
  let totalGross=0,totalSF=0,holesPlayed=0;
  const ps=scores[player.id]||{};
  for(let h=0;h<course.holes;h++){const g=ps[h];if(g!==null&&g!==undefined&&g!==""){holesPlayed++;totalGross+=parseInt(g);const sf=calcStableford(g,course.pars[h],strokes[h]);if(sf!==null)totalSF+=sf;}}
  const quota=36-player.handicap;
  return{totalGross,stableford:totalSF,quota,quotaPos:totalSF-quota,holesPlayed};
}

const S={
  app:{minHeight:"100vh",background:"#0f1f14",color:"#f0ede4",fontFamily:"system-ui,sans-serif"},
  card:{background:"#1a2e1e",borderRadius:16,padding:"1rem 1.25rem",border:"1px solid #2a4030"},
  cardGold:{background:"#1a2e1e",borderRadius:16,padding:"1rem 1.25rem",border:"1px solid #b8962e"},
  btn:(bg="#1a6b3c",color="#fff")=>({background:bg,color,border:"none",borderRadius:12,padding:"12px 20px",fontWeight:600,fontSize:15,cursor:"pointer",width:"100%"}),
  btnSm:(bg="#1a6b3c",color="#fff")=>({background:bg,color,border:"none",borderRadius:8,padding:"8px 14px",fontWeight:600,fontSize:13,cursor:"pointer"}),
  input:{background:"#0f1f14",border:"1px solid #2a4030",borderRadius:10,padding:"12px 14px",color:"#f0ede4",fontSize:15,width:"100%",boxSizing:"border-box"},
  label:{fontSize:12,color:"#8fa898",marginBottom:4,display:"block",textTransform:"uppercase",letterSpacing:1},
  h1:{fontSize:26,fontWeight:700,color:"#e8c84a",margin:0},
  h3:{fontSize:16,fontWeight:600,color:"#c8d9c0",margin:0},
  muted:{color:"#7a9080",fontSize:13},
  tab:(a)=>({flex:1,padding:"10px 4px",background:a?"#1a6b3c":"transparent",color:a?"#fff":"#7a9080",border:"none",borderRadius:10,fontWeight:600,fontSize:13,cursor:"pointer"}),
};

export default function App() {
  const [ready,setReady]=useState(false);
  const [screen,setScreen]=useState("login");
  const [currentPlayer,setCurrentPlayer]=useState(null);
  const [players,setPlayers]=useState(DEMO_PLAYERS);
  const [teams,setTeams]=useState(()=>generateTeams(DEMO_PLAYERS));
  const [course,setCourse]=useState(DEMO_COURSE);
  const [scores,setScores]=useState({});
  const [activeTab,setActiveTab]=useState("individual");
  const [scoringHole,setScoringHole]=useState(0);
  const [closestPin,setClosestPin]=useState({});
  const [longestDrive,setLongestDrive]=useState(null);
  const [notification,setNotification]=useState(null);
  const [syncing,setSyncing]=useState(false);

  const showNotif=(msg,type="success")=>{setNotification({msg,type});setTimeout(()=>setNotification(null),2500);};

  useEffect(()=>{
    const init=async()=>{
      await signInAnonymously(auth);
      const ref=doc(db,"tournament","current");
      const snap=await getDoc(ref);
      if(!snap.exists())await setDoc(ref,{players:DEMO_PLAYERS,teams:generateTeams(DEMO_PLAYERS),course:DEMO_COURSE,closestPin:{},longestDrive:null,createdAt:new Date()});
      setReady(true);
    };
    init().catch(console.error);
    const u1=onSnapshot(doc(db,"tournament","current"),snap=>{
      if(snap.exists()){const d=snap.data();if(d.players)setPlayers(d.players);if(d.teams)setTeams(d.teams);if(d.course)setCourse(d.course);if(d.closestPin!==undefined)setClosestPin(d.closestPin||{});if(d.longestDrive!==undefined)setLongestDrive(d.longestDrive);}
    });
    const u2=onSnapshot(collection(db,"scores"),snap=>{const s={};snap.forEach(d=>{s[d.id]=d.data();});setScores(s);});
    return()=>{u1();u2();};
  },[]);

  const updateScore=useCallback(async(pid,hole,val)=>{
    setScores(p=>({...p,[pid]:{...(p[pid]||{}),[hole]:val}}));
    setSyncing(true);
    try{await setDoc(doc(db,"scores",pid),{[hole]:val},{merge:true});}catch(e){showNotif("Sync error","error");}finally{setSyncing(false);}
  },[]);

  const updateTournament=useCallback(async(data)=>{
    setSyncing(true);
    try{await setDoc(doc(db,"tournament","current"),data,{merge:true});}catch(e){showNotif("Sync error","error");}finally{setSyncing(false);}
  },[]);

  const getTeam=(pid)=>teams.find(t=>t.members.includes(pid));

  if(!ready)return(<div style={{...S.app,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,minHeight:"100vh"}}><div style={{fontSize:56}}>⛳</div><div style={{color:"#e8c84a",fontWeight:700,fontSize:22}}>ForeAmigos</div><div style={S.muted}>Conectando...</div><style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style><div style={{width:36,height:36,border:"3px solid #2a4030",borderTopColor:"#e8c84a",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/></div>);

  if(screen==="login")return <LoginScreen players={players} onLogin={p=>{setCurrentPlayer(p);setScreen("home");}} onAdmin={()=>setScreen("admin")} adminPin={ADMIN_PIN}/>;
  if(screen==="admin")return <AdminScreen players={players} setPlayers={setPlayers} teams={teams} setTeams={setTeams} course={course} setCourse={setCourse} scores={scores} setScores={setScores} onLogout={()=>setScreen("login")} generateTeams={generateTeams} showNotif={showNotif} updateTournament={updateTournament} db={db}/>;

  if(screen==="home"&&currentPlayer){
    const team=getTeam(currentPlayer.id);
    const stats=getTotalStats(currentPlayer,scores,course,players);
    return(<div style={S.app}><Notification data={notification}/>{syncing&&<SyncBadge/>}<div style={{padding:"1.5rem 1rem 5rem"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}><div><div style={S.h1}>{course.name}</div><div style={{...S.muted,display:"flex",alignItems:"center",gap:6}}><span style={{width:7,height:7,borderRadius:"50%",background:"#4ade80",display:"inline-block"}}/>Live</div></div><button onClick={()=>{setCurrentPlayer(null);setScreen("login");}} style={S.btnSm("#2a4030","#7a9080")}>Logout</button></div><div style={{...S.cardGold,marginBottom:"1rem",display:"flex",gap:12,alignItems:"center"}}><Avatar player={currentPlayer} size={52}/><div><div style={{fontSize:20,fontWeight:700,color:"#e8c84a"}}>Bienvenido, {currentPlayer.name}!</div><div style={{color:"#8fa898",fontSize:14}}>{team?.name} - HCP {currentPlayer.handicap}</div></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:"1rem"}}><StatCard label="Stableford" value={stats.stableford} unit="pts"/><StatCard label="Quota" value={(stats.quotaPos>=0?"+":"")+stats.quotaPos} unit={"de "+stats.quota}/><StatCard label="Hoyos" value={stats.holesPlayed+"/"+course.holes} unit="jugados"/><StatCard label="Gross" value={stats.holesPlayed>0?stats.totalGross:""} unit="golpes"/></div><button onClick={()=>setScreen("scorecard")} style={{...S.btn(),marginBottom:"1rem",fontSize:17,padding:16}}>⛳ Ingresar Scores</button><button onClick={()=>setScreen("leaderboard")} style={{...S.btn("#1a2e1e","#e8c84a"),marginBottom:"1rem",border:"1px solid #b8962e"}}>🏆🏆 Leaderboard en Vivo</button><div style={{...S.card,marginBottom:"1rem"}}><div style={{...S.h3,marginBottom:12}}>Premios Especiales</div><SpecialAwards players={players} closestPin={closestPin} longestDrive={longestDrive} setClosestPin={cp=>{setClosestPin(cp);updateTournament({closestPin:cp});}} setLongestDrive={ld=>{setLongestDrive(ld);updateTournament({longestDrive:ld});}} currentPlayer={currentPlayer} course={course} showNotif={showNotif}/></div></div><BottomNav screen="home" setScreen={setScreen}/></div>);
  }

  if(screen==="scorecard"&&currentPlayer)return <ScorecardScreen currentPlayer={currentPlayer} players={players} course={course} scores={scores} updateScore={updateScore} scoringHole={scoringHole} setScoringHole={setScoringHole} onBack={()=>setScreen("home")} showNotif={showNotif} syncing={syncing}/>;

  if(screen==="leaderboard")return(<div style={S.app}><Notification data={notification}/>{syncing&&<SyncBadge/>}<div style={{padding:"1.5rem 1rem 5rem"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}><div style={S.h1}>Leaderboard</div><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{width:8,height:8,borderRadius:"50%",background:"#4ade80",display:"inline-block"}}/><span style={{...S.muted,fontSize:11}}>LIVE</span><button onClick={()=>setScreen("home")} style={S.btnSm("#2a4030","#7a9080")}>Atrs</button></div></div><div style={{display:"flex",gap:8,background:"#0f1f14",borderRadius:12,padding:4,marginBottom:"1rem"}}>{["individual","teams","scorecard"].map(t=>(<button key={t} style={S.tab(activeTab===t)} onClick={()=>setActiveTab(t)}>{t==="individual"?"Individual":t==="teams"?"Equipos":"Scorecard"}</button>))}</div>{activeTab==="individual"&&<IndividualLeaderboard players={players} scores={scores} course={course} teams={teams}/>}{activeTab==="teams"&&<TeamLeaderboard teams={teams} players={players} scores={scores} course={course}/>}{activeTab==="scorecard"&&<FullScorecard players={players} scores={scores} course={course} currentPlayer={currentPlayer}/>}</div><BottomNav screen="leaderboard" setScreen={setScreen}/></div>);

  return null;
}

function SyncBadge(){return(<div style={{position:"fixed",top:12,right:12,background:"#1a3d2a",border:"1px solid #4ade80",borderRadius:20,padding:"4px 10px",fontSize:11,color:"#4ade80",fontWeight:600,zIndex:300,display:"flex",alignItems:"center",gap:5}}><span style={{width:6,height:6,borderRadius:"50%",background:"#4ade80",display:"inline-block"}}/>Syncing...</div>);}

function LoginScreen({players,onLogin,onAdmin,adminPin}){
  const [step,setStep]=useState("select"),[selected,setSelected]=useState(null),[pin,setPin]=useState(""),[adminMode,setAdminMode]=useState(false),[err,setErr]=useState("");
  const tryLogin=useCallback((cp)=>{const p=cp??pin;if(adminMode){if(p===adminPin)onAdmin();else{setPin("");setErr("PIN incorrecto");}return;}if(p===selected.pin){onLogin(selected);setPin("");}else{setPin("");setErr("PIN incorrecto");};},[pin,adminMode,adminPin,selected,onAdmin,onLogin]);
  return(<div style={{...S.app,display:"flex",flexDirection:"column",minHeight:"100vh"}}><div style={{background:"#0a1a0d",padding:"3rem 1.5rem 2rem",textAlign:"center"}}><div style={{fontSize:56,marginBottom:8}}>⛳</div><div style={S.h1}>ForeAmigos</div><div style={{color:"#8fa898",marginTop:4}}>Torneo en Vivo</div><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:8}}><span style={{width:7,height:7,borderRadius:"50%",background:"#4ade80",display:"inline-block"}}/><span style={{fontSize:12,color:"#4ade80",fontWeight:600}}>Firebase Conectado</span></div></div><div style={{padding:"1.5rem",flex:1}}>{step==="select"&&!adminMode&&(<><div style={{...S.h3,marginBottom:"1rem",textAlign:"center"}}>Selecciona tu nombre</div><div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:"1.5rem"}}>{players.map(p=>(<button key={p.id} onClick={()=>{setSelected(p);setStep("pin");setErr("");}} style={{...S.card,display:"flex",alignItems:"center",gap:12,border:"none",cursor:"pointer",textAlign:"left",padding:"14px 16px"}}><Avatar player={p} size={40}/><div><div style={{fontWeight:600,color:"#f0ede4"}}>{p.name}</div><div style={S.muted}>HCP {p.handicap}</div></div><div style={{marginLeft:"auto",color:"#4ade80",fontSize:18}}></div></button>))}</div><button onClick={()=>{setAdminMode(true);setStep("pin");}} style={S.btn("#2a4030","#8fa898")}>Admin</button></>)}{step==="pin"&&(<div style={{maxWidth:300,margin:"0 auto"}}><div style={{textAlign:"center",marginBottom:"1.5rem"}}>{adminMode?<div style={S.h3}>PIN Admin</div>:<><Avatar player={selected} size={56}/><div style={{...S.h3,marginTop:12}}>{selected?.name}</div><div style={S.muted}>Ingresa tu PIN</div></>}</div><PinPad value={pin} onChange={setPin} onSubmit={tryLogin}/>{err&&<div style={{color:"#f87171",textAlign:"center",marginTop:8,fontSize:14}}>{err}</div>}<button onClick={()=>{setStep("select");setAdminMode(false);setPin("");setErr("");}} style={{...S.btn("#2a4030","#7a9080"),marginTop:12}}> Atrs</button></div>)}</div></div>);
}

function PinPad({value,onChange,onSubmit}){
  const dots=Array(4).fill(0).map((_,i)=>value.length>i);
  const press=(k)=>{if(k==="del"){onChange(value.slice(0,-1));return;}if(value.length>=4)return;const n=value+k;onChange(n);if(n.length===4)setTimeout(()=>onSubmit(n),200);};
  return(<div><div style={{display:"flex",justifyContent:"center",gap:16,marginBottom:24}}>{dots.map((f,i)=><div key={i} style={{width:16,height:16,borderRadius:"50%",background:f?"#e8c84a":"#2a4030",border:"2px solid #b8962e",transition:"background 0.2s"}}/>)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>{["1","2","3","4","5","6","7","8","9","","0","del"].map((k,i)=>(<button key={i} onClick={()=>k&&press(k)} style={{...S.btn(k?"#1a2e1e":"transparent","#f0ede4"),border:k?"1px solid #2a4030":"none",fontSize:k==="del"?20:22,padding:14,opacity:k?1:0,pointerEvents:k?"auto":"none"}}>{k==="del"?"":k}</button>))}</div></div>);
}

function AdminScreen({players,setPlayers,teams,setTeams,course,setCourse,scores,setScores,onLogout,generateTeams,showNotif,updateTournament,db}){
  const [tab,setTab]=useState("players");
  const [np,setNp]=useState({name:"",handicap:"",pin:"",color:"#1a6b3c"});
  const [ce,setCe]=useState(course);
  const COLORS=["#1a6b3c","#2563eb","#7c3aed","#db2777","#d97706","#dc2626","#0891b2","#65a30d","#059669"];
  useEffect(()=>{ setCe(prev => JSON.stringify(prev)===JSON.stringify(course)?prev:{...course}); },[JSON.stringify(course)]);
  const add=()=>{if(!np.name||!np.handicap||!np.pin)return;const p={...np,id:"p"+Date.now(),handicap:parseInt(np.handicap),initials:np.name.slice(0,2).toUpperCase()};const u=[...players,p];const t=generateTeams(u);setPlayers(u);setTeams(t);updateTournament({players:u,teams:t});setNp({name:"",handicap:"",pin:"",color:"#1a6b3c"});showNotif(p.name+" agregado!");};
  const remove=(id)=>{const u=players.filter(p=>p.id!==id);const t=generateTeams(u);setPlayers(u);setTeams(t);updateTournament({players:u,teams:t});};
  const saveC=()=>{setCourse(ce);updateTournament({course:ce});showNotif("Cancha guardada!");};
  const regen=()=>{const t=generateTeams(players);setTeams(t);updateTournament({teams:t});showNotif("Equipos regenerados!");};
  const reset=async()=>{setScores({});const snap=await getDocs(collection(db,"scores"));const b=writeBatch(db);snap.forEach(d=>b.delete(d.ref));await b.commit();showNotif("Scores reiniciados!");};
  const updatePar=(i,val)=>setCe(c=>{const p=[...c.pars];p[i]=parseInt(val)||4;return{...c,pars:p};});
  const updateSI=(i,val)=>setCe(c=>{const s=[...c.strokeIndex];s[i]=parseInt(val)||i+1;return{...c,strokeIndex:s};});
  return(<div style={S.app}><div style={{padding:"1.5rem 1rem 5rem"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}><div><div style={S.h1}>Admin</div><div style={S.muted}>ForeAmigos</div></div><button onClick={onLogout} style={S.btnSm("#2a4030","#f87171")}>Logout</button></div><div style={{display:"flex",gap:6,background:"#0f1f14",borderRadius:12,padding:4,marginBottom:"1rem"}}>{["players","teams","course","danger"].map(t=>(<button key={t} style={S.tab(tab===t)} onClick={()=>setTab(t)}>{t==="players"?"Jugadores":t==="teams"?"Equipos":t==="course"?"Cancha":""}</button>))}</div>{tab==="players"&&(<div><div style={{...S.card,marginBottom:"1rem"}}><div style={{...S.h3,marginBottom:12}}>Agregar</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}><div><label style={S.label}>Nombre</label><input style={S.input} value={np.name} onChange={e=>setNp(p=>({...p,name:e.target.value}))} placeholder="Nombre"/></div><div><label style={S.label}>HCP</label><input style={S.input} type="number" value={np.handicap} onChange={e=>setNp(p=>({...p,handicap:e.target.value}))} placeholder="0-54"/></div></div><div style={{marginBottom:8}}><label style={S.label}>PIN</label><input style={S.input} type="password" value={np.pin} onChange={e=>setNp(p=>({...p,pin:e.target.value}))} placeholder="1234" maxLength={4}/></div><div style={{marginBottom:12}}><label style={S.label}>Color</label><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{COLORS.map(c=><div key={c} onClick={()=>setNp(p=>({...p,color:c}))} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:np.color===c?"3px solid #e8c84a":"3px solid transparent"}}/>)}</div></div><button onClick={add} style={S.btn()}>Agregar</button></div>{players.map(p=>(<div key={p.id} style={{...S.card,marginBottom:8,display:"flex",alignItems:"center",gap:12}}><Avatar player={p} size={40}/><div style={{flex:1}}><div style={{fontWeight:600}}>{p.name}</div><div style={S.muted}>HCP {p.handicap} - PIN: {p.pin}</div></div><button onClick={()=>remove(p.id)} style={S.btnSm("#4a1a1a","#f87171")}></button></div>))}</div>)}{tab==="teams"&&(<div><button onClick={regen} style={{...S.btn(),marginBottom:"1rem"}}>🔀🔀 Regenerar</button>{teams.map(t=>(<div key={t.id} style={{...S.card,marginBottom:12,borderLeft:"4px solid "+t.color}}><div style={{fontWeight:700,color:t.color,marginBottom:8}}>{t.name}</div>{t.members.map(mid=>{const p=players.find(x=>x.id===mid);return p?(<div key={mid} style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}><Avatar player={p} size={32}/><span>{p.name}</span><span style={{...S.muted,marginLeft:"auto"}}>HCP {p.handicap}</span></div>):null;})}</div>))}</div>)}{tab==="course"&&(<div style={S.card}><label style={S.label}>Nombre de la Cancha</label><input style={{...S.input,marginBottom:12}} value={ce.name||""} onChange={e=>setCe(c=>({...c,name:e.target.value}))} placeholder="Ej: Club de Golf Monterrey"/><label style={S.label}>Nmero de Hoyos</label><div style={{display:"flex",gap:8,marginBottom:16}}>{[9,18].map(n=><button key={n} onClick={()=>setCe(c=>({...c,holes:n,pars:Array(n).fill(4),strokeIndex:Array.from({length:n},(_,i)=>i+1)}))} style={{...S.btnSm(ce.holes===n?"#1a6b3c":"#1a2e1e","#f0ede4"),flex:1,padding:"12px"}}>{n} Hoyos</button>)}</div><div style={{overflowX:"auto",marginBottom:16}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr><th style={{color:"#8fa898",padding:"6px 8px",textAlign:"left"}}>Hoyo</th>{Array.from({length:ce.holes||9},(_,i)=><th key={i} style={{color:"#e8c84a",padding:"4px 2px",textAlign:"center",minWidth:44,fontWeight:700}}>{i+1}</th>)}</tr></thead><tbody><tr style={{borderBottom:"1px solid #2a4030"}}><td style={{color:"#8fa898",padding:"8px",fontWeight:600}}>Par</td>{Array.from({length:ce.holes||9},(_,i)=>(<td key={i} style={{padding:"4px 2px"}}><input type="number" min={3} max={5} value={ce.pars?.[i]??4} onChange={e=>updatePar(i,e.target.value)} onFocus={e=>e.target.select()} style={{background:"#0f1f14",border:"1px solid #2a4030",borderRadius:6,padding:"8px 2px",color:"#f0ede4",fontSize:14,width:40,textAlign:"center",boxSizing:"border-box"}}/></td>))}</tr><tr><td style={{color:"#8fa898",padding:"8px",fontWeight:600}}>SI</td>{Array.from({length:ce.holes||9},(_,i)=>(<td key={i} style={{padding:"4px 2px"}}><input type="number" min={1} max={ce.holes||9} value={ce.strokeIndex?.[i]??i+1} onChange={e=>updateSI(i,e.target.value)} onFocus={e=>e.target.select()} style={{background:"#0f1f14",border:"1px solid #2a4030",borderRadius:6,padding:"8px 2px",color:"#f0ede4",fontSize:14,width:40,textAlign:"center",boxSizing:"border-box"}}/></td>))}</tr></tbody></table></div><button onClick={saveC} style={S.btn()}>🔀Save Guardar Cancha</button></div>)}{tab==="danger"&&(<div style={{...S.card,border:"1px solid #4a1a1a"}}><div style={{...S.h3,color:"#f87171",marginBottom:12}}>Zona de Peligro</div><div style={{...S.muted,marginBottom:16}}>Esta accin no se puede deshacer.</div><button onClick={reset} style={S.btn("#4a1a1a","#f87171")}>🔀Delete Reiniciar Todos los Scores</button></div>)}</div></div>);
}

function ScorecardScreen({currentPlayer,players,course,scores,updateScore,scoringHole,setScoringHole,onBack,showNotif,syncing}){
  const lowestHcp=Math.min(...players.map(p=>p.handicap));
  const myStrokes=calcHandicapStrokes(currentPlayer.handicap,lowestHcp,course.strokeIndex,course.holes);
  const myScores=scores[currentPlayer.id]||{};
  const par=course.pars[scoringHole],stroke=myStrokes[scoringHole],cv=myScores[scoringHole]??"";
  const sf=calcStableford(cv,par,stroke);
  const stats=getTotalStats(currentPlayer,scores,course,players);
  const sc=(g,par,s)=>{if(g===""||g===null||g===undefined)return"#7a9080";const n=parseInt(g)-s,d=par-n;return d>=2?"#e8c84a":d>=1?"#4ade80":d===0?"#f0ede4":"#f87171";};
  const sl=(p)=>{if(p===null)return"";if(p>=4)return"guila";if(p===3)return"Birdie";if(p===2)return"Par";if(p===1)return"Bogey";return"Sin pts";};
  return(<div style={S.app}>{syncing&&<SyncBadge/>}<div style={{padding:"1rem 1rem 5rem"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}><button onClick={onBack} style={S.btnSm("#2a4030","#8fa898")}> Atrs</button><div style={{textAlign:"center"}}><div style={{fontWeight:700,color:"#e8c84a"}}>{currentPlayer.name}</div><div style={S.muted}>HCP {currentPlayer.handicap}</div></div><div style={{...S.muted,fontSize:13}}>{course.holes}H</div></div><div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:"1rem"}}>{Array.from({length:course.holes},(_,i)=>{const g=myScores[i],played=g!==undefined&&g!=="",c=played?sc(g,course.pars[i],myStrokes[i]):"#2a4030";return(<button key={i} onClick={()=>setScoringHole(i)} style={{minWidth:36,height:36,borderRadius:8,background:scoringHole===i?"#e8c84a":"#1a2e1e",color:scoringHole===i?"#0f1f14":c,border:played?"1px solid "+c:"1px solid #2a4030",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0}}>{i+1}</button>);})}</div><div style={{...S.cardGold,marginBottom:"1rem",textAlign:"center"}}><div style={{fontSize:13,color:"#8fa898",marginBottom:4}}>HOYO {scoringHole+1}</div><div style={{display:"flex",justifyContent:"center",gap:24,marginBottom:8}}><div><div style={S.muted}>Par</div><div style={{fontSize:22,fontWeight:700}}>{par}</div></div><div><div style={S.muted}>SI</div><div style={{fontSize:22,fontWeight:700}}>{course.strokeIndex[scoringHole]}</div></div><div><div style={S.muted}>Golpes</div><div style={{fontSize:22,fontWeight:700,color:"#e8c84a"}}>{stroke>0?"+"+stroke:"0"}</div></div></div><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:8}}><button onClick={()=>{const v=parseInt(cv)||par;updateScore(currentPlayer.id,scoringHole,Math.max(1,v-1));}} style={{width:52,height:52,borderRadius:26,background:"#2a4030",border:"none",color:"#f0ede4",fontSize:24,cursor:"pointer",fontWeight:700}}></button><div style={{fontSize:56,fontWeight:800,color:sc(cv,par,stroke),minWidth:64,textAlign:"center"}}>{cv===""?"":cv}</div><button onClick={()=>{const v=parseInt(cv)||(par-1);updateScore(currentPlayer.id,scoringHole,v+1);}} style={{width:52,height:52,borderRadius:26,background:"#2a4030",border:"none",color:"#f0ede4",fontSize:24,cursor:"pointer",fontWeight:700}}>+</button></div>{sf!==null&&<div style={{background:"#0f1f14",borderRadius:8,padding:"6px 16px",display:"inline-block"}}><span style={{color:"#e8c84a",fontWeight:700}}>{sf} pts</span><span style={{color:"#8fa898",marginLeft:8,fontSize:13}}>{sl(sf)}</span></div>}<div style={{display:"flex",gap:8,marginTop:12}}>{[par-1,par,par+1,par+2].map(v=>(<button key={v} onClick={()=>updateScore(currentPlayer.id,scoringHole,v)} style={{flex:1,padding:"10px 4px",borderRadius:8,background:parseInt(cv)===v?"#1a6b3c":"#1a2e1e",border:"1px solid #2a4030",color:parseInt(cv)===v?"#fff":"#8fa898",fontWeight:600,fontSize:14,cursor:"pointer"}}>{v}</button>))}</div></div><div style={{...S.card,marginBottom:"1rem"}}><div style={{...S.h3,marginBottom:8}}>Mi Ronda</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>{[{l:"Gross",v:stats.totalGross||""},{l:"SF",v:stats.stableford+"pts"},{l:"Quota",v:(stats.quotaPos>=0?"+":"")+stats.quotaPos}].map(({l,v})=>(<div key={l} style={{background:"#0f1f14",borderRadius:8,padding:8,textAlign:"center"}}><div style={{...S.muted,fontSize:11}}>{l}</div><div style={{fontWeight:700,fontSize:15,color:"#e8c84a"}}>{v}</div></div>))}</div></div><div style={{...S.h3,marginBottom:8}}>Otros</div>{players.filter(p=>p.id!==currentPlayer.id).map(p=>{const ps=scores[p.id]||{},ps2=calcHandicapStrokes(p.handicap,lowestHcp,course.strokeIndex,course.holes),g=ps[scoringHole],psf=calcStableford(g,course.pars[scoringHole],ps2[scoringHole]);return(<div key={p.id} style={{...S.card,marginBottom:8,display:"flex",alignItems:"center",gap:12,opacity:0.8}}><Avatar player={p} size={36}/><div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{p.name}</div><div style={S.muted}> Solo lectura</div></div><div style={{textAlign:"right"}}><div style={{fontWeight:700,fontSize:18,color:g?sc(g,course.pars[scoringHole],ps2[scoringHole]):"#2a4030"}}>{g||""}</div>{psf!==null&&<div style={{fontSize:12,color:"#8fa898"}}>{psf}pts</div>}</div></div>);})}<div style={{display:"flex",gap:8,marginTop:"1rem"}}><button onClick={()=>setScoringHole(h=>Math.max(0,h-1))} disabled={scoringHole===0} style={{...S.btn("#1a2e1e","#8fa898"),flex:1}}> Anterior</button><button onClick={()=>{if(scoringHole<course.holes-1)setScoringHole(h=>h+1);else{showNotif("Ronda completa! ");onBack();}}} style={{...S.btn(),flex:1}}>{scoringHole<course.holes-1?"Siguiente ":"Terminar "}</button></div></div></div>);
}

function IndividualLeaderboard({players,scores,course,teams}){
  const ranked=players.map(p=>{const s=getTotalStats(p,scores,course,players);return{...p,...s,team:teams.find(t=>t.members.includes(p.id))};}).sort((a,b)=>b.quotaPos-a.quotaPos);
  return(<div>{ranked.map((p,i)=>(<div key={p.id} style={{...S.card,marginBottom:8,display:"flex",alignItems:"center",gap:12,borderLeft:i===0?"3px solid #e8c84a":"1px solid #2a4030"}}><div style={{fontSize:20,fontWeight:800,color:i===0?"#e8c84a":i===1?"#c0c0c0":i===2?"#cd7f32":"#4a6050",minWidth:28,textAlign:"center"}}>{i===0?"":i===1?"":i===2?"":i+1}</div><Avatar player={p} size={38}/><div style={{flex:1}}><div style={{fontWeight:600}}>{p.name}</div><div style={S.muted}>{p.team?.name} - HCP {p.handicap}</div></div><div style={{textAlign:"right"}}><div style={{fontWeight:800,fontSize:18,color:p.quotaPos>0?"#4ade80":p.quotaPos<0?"#f87171":"#f0ede4"}}>{p.holesPlayed>0?(p.quotaPos>=0?"+":"")+p.quotaPos:""}</div><div style={S.muted}>{p.stableford}pts - {p.holesPlayed}H</div></div></div>))}<div style={{...S.muted,textAlign:"center",marginTop:8,fontSize:12}}>Ordenado por cuota</div></div>);
}

function TeamLeaderboard({teams,players,scores,course}){
  const ts=teams.map(t=>{const m=t.members.map(id=>players.find(p=>p.id===id)).filter(Boolean);return{...t,totalSF:m.reduce((s,p)=>s+getTotalStats(p,scores,course,players).stableford,0),holesPlayed:m.reduce((s,p)=>s+getTotalStats(p,scores,course,players).holesPlayed,0),members:m};}).sort((a,b)=>b.totalSF-a.totalSF);
  return(<div>{ts.map((t,i)=>(<div key={t.id} style={{...S.card,marginBottom:12,borderLeft:"4px solid "+t.color}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontWeight:700,fontSize:17,color:t.color}}>{i===0?"🏆🏆 ":""}{t.name}</div><div style={S.muted}>{t.holesPlayed} hoyos</div></div><div style={{fontSize:32,fontWeight:800,color:"#e8c84a"}}>{t.totalSF}</div></div>{t.members.map(p=>{const s=getTotalStats(p,scores,course,players);return(<div key={p.id} style={{display:"flex",alignItems:"center",gap:8,paddingTop:8,borderTop:"1px solid #2a4030"}}><Avatar player={p} size={28}/><span style={{fontSize:13,flex:1}}>{p.name}</span><span style={{fontWeight:700,color:"#e8c84a",fontSize:14}}>{s.stableford}pts</span></div>);})}</div>))}</div>);
}

function FullScorecard({players,scores,course,currentPlayer}){
  const lh=Math.min(...players.map(p=>p.handicap));
  return(<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:400}}><thead><tr style={{borderBottom:"1px solid #2a4030"}}><th style={{color:"#8fa898",padding:"6px 4px",textAlign:"left"}}>Jugador</th>{Array.from({length:course.holes},(_,i)=><th key={i} style={{color:"#8fa898",padding:"4px 2px",textAlign:"center",minWidth:22}}>{i+1}</th>)}<th style={{color:"#e8c84a",padding:"4px 6px",textAlign:"center"}}>SF</th></tr></thead><tbody>{players.map(p=>{const ps=scores[p.id]||{},st=calcHandicapStrokes(p.handicap,lh,course.strokeIndex,course.holes);let t=0;return(<tr key={p.id} style={{borderBottom:"1px solid #1a2e1e",background:currentPlayer?.id===p.id?"#1a2e1e":"transparent"}}><td style={{padding:"6px 4px",fontWeight:600,fontSize:12,color:currentPlayer?.id===p.id?"#e8c84a":"#f0ede4"}}>{p.name.slice(0,6)}</td>{Array.from({length:course.holes},(_,i)=>{const g=ps[i],sf=calcStableford(g,course.pars[i],st[i]);if(sf!==null)t+=sf;const bg=g?parseInt(g)<=course.pars[i]-st[i]-1?"#e8c84a":parseInt(g)<=course.pars[i]-st[i]?"#1a6b3c":parseInt(g)<=course.pars[i]-st[i]+1?"#1a2e1e":"#3a1a1a":"transparent";return<td key={i} style={{textAlign:"center",padding:"4px 2px",background:bg,borderRadius:4,color:g?"#fff":"#2a4030"}}>{g||"-"}</td>;})}<td style={{textAlign:"center",fontWeight:700,color:"#e8c84a",padding:"4px 6px"}}>{t}</td></tr>);})}</tbody></table></div>);
}

function SpecialAwards({players,closestPin,longestDrive,setClosestPin,setLongestDrive,currentPlayer,course,showNotif}){
  const [cpH,setCpH]=useState(1);
  const cp=players.find(p=>p.id===closestPin[cpH]),ld=players.find(p=>p.id===longestDrive);
  return(<div style={{display:"flex",flexDirection:"column",gap:10}}><div style={{background:"#0f1f14",borderRadius:10,padding:12}}><div style={{fontWeight:600,color:"#e8c84a",marginBottom:8}}> Ms Cerca</div><select value={cpH} onChange={e=>setCpH(parseInt(e.target.value))} style={{...S.input,width:"auto",marginBottom:8}}>{Array.from({length:course.holes},(_,i)=><option key={i} value={i+1}>Hoyo {i+1}</option>)}</select>{cp?<div style={{...S.muted,marginBottom:6}}>Actual: <span style={{color:"#4ade80",fontWeight:600}}>{cp.name}</span></div>:<div style={{...S.muted,marginBottom:6}}>Sin reclamar</div>}<button onClick={()=>{const c={...closestPin,[cpH]:currentPlayer.id};setClosestPin(c);showNotif(currentPlayer.name+" reclama H"+cpH+"! ");}} style={S.btnSm()}>Reclamar H{cpH}</button></div><div style={{background:"#0f1f14",borderRadius:10,padding:12}}><div style={{fontWeight:600,color:"#e8c84a",marginBottom:8}}> Drive Ms Largo</div>{ld?<div style={{...S.muted,marginBottom:6}}>Actual: <span style={{color:"#4ade80",fontWeight:600}}>{ld.name}</span></div>:<div style={{...S.muted,marginBottom:6}}>Sin reclamar</div>}<button onClick={()=>{setLongestDrive(currentPlayer.id);showNotif(currentPlayer.name+" reclama LD! ");}} style={S.btnSm()}>Reclamar</button></div></div>);
}

function Avatar({player,size=40}){return(<div style={{width:size,height:size,borderRadius:"50%",background:player.color||"#1a6b3c",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:size*0.35,color:"#fff",flexShrink:0}}>{player.initials||player.name?.slice(0,2).toUpperCase()}</div>);}
function StatCard({label,value,unit}){return(<div style={{background:"#1a2e1e",borderRadius:12,padding:"14px 12px",textAlign:"center",border:"1px solid #2a4030"}}><div style={{...S.muted,fontSize:11,marginBottom:4}}>{label}</div><div style={{fontSize:22,fontWeight:800,color:"#e8c84a"}}>{value}</div>{unit&&<div style={{...S.muted,fontSize:11}}>{unit}</div>}</div>);}
function BottomNav({screen,setScreen}){return(<div style={{position:"fixed",bottom:0,left:0,right:0,background:"#0a1a0d",borderTop:"1px solid #2a4030",display:"flex",padding:"8px 0 12px",zIndex:100}}>{[{id:"home",icon:"",label:"Inicio"},{id:"scorecard",icon:"⛳",label:"Score"},{id:"leaderboard",icon:"🏆🏆",label:"Board"}].map(it=>(<button key={it.id} onClick={()=>setScreen(it.id)} style={{flex:1,background:"none",border:"none",color:screen===it.id?"#e8c84a":"#4a6050",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><div style={{fontSize:20}}>{it.icon}</div><div style={{fontSize:11,fontWeight:600}}>{it.label}</div></button>))}</div>);}
function Notification({data}){if(!data)return null;return(<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:data.type==="error"?"#4a1a1a":"#1a3d2a",color:data.type==="error"?"#f87171":"#4ade80",padding:"10px 20px",borderRadius:12,fontWeight:600,fontSize:14,zIndex:200,border:"1px solid "+(data.type==="error"?"#f87171":"#4ade80"),whiteSpace:"nowrap"}}>{data.msg}</div>);}