// v1778826170047
import { useState, useEffect, useCallback } from "react";

  const [chatMsg,setChatMsg]=useState(null);
  const [chatOpen,setChatOpen]=useState(false);
  const [chatInput,setChatInput]=useState("");

  const sendChat=(text,name)=>{
    if(!text||!text.trim())return;
    const chat={name:name||"?",text:text.trim().slice(0,80),ts:Date.now()};
    setChatMsg(chat);
    setChatInput("");
    setChatOpen(false);
    if(window._chatTimer)clearTimeout(window._chatTimer);
    window._chatTimer=setTimeout(()=>setChatMsg(null),4000);
    if(!window._seenChats)window._seenChats=new Set();
    window._seenChats.add(chat.ts);
    updateTournament({lastChat:chat});
  };
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


const PICKUP_PHRASES = [
  "Por que Dios mio, POR QUE",
  "Que me entierren en este hoyo",
  "Me arrepiento de haber nacido",
  "Hasta mi sombra me abandono",
  "Mandenle flores a mi score",
  "Fue el puto viento",
  "El sol me deslumbro",
  "Me aprietan los zapatos",
  "Un pajaro me distrajo",
  "El pasto esta raro hoy",
  "El palo viene chueco de fabrica",
  "La cancha esta mal disenada",
  "Vendo mis palos",
  "Me voy al tenis",
  "Mejor juego futbol",
  "El golf no era lo mio",
  "Me retiro a la playa",
  "Me pusieron mal el handicap",
  "Me estaban viendo y me puse nervioso",
  "Me llego un mensaje y me desconcentre",
  "Alguien se movio",
  "Me echaron el mal de ojo",
  "Ya para que, mejor chelas",
  "Le pago a alguien que juegue por mi",
  "Soy oficialmente el peor del grupo",
  "Ni en el Wii Sports me va tan mal",
  "Juro que en los tacos soy mejor",
  "Santa Barbara bendita",
  "Me voy a confesar despues de esto",
  "Culpo a mis ancestros",
  "Chinguen a su madre todos",
  "El hoyo puede irse a la verga",
  "Se lo dedico a mi psicologo",
  "Esta caguama es pa olvidar",
  "Ya me quiebre como pinata"
];

function getPickupPhrase(){ return PICKUP_PHRASES[Math.floor(Math.random()*PICKUP_PHRASES.length)]; }
function getPickupScore(par, strokes){ return par + strokes + 2 + 1; }

function playingHcp(hcp){ if(hcp<=18) return hcp; return Math.min(Math.round(hcp*0.75),36); }

function calcHandicapStrokes(playerHcp,lowestHcp,strokeIndexes,totalHoles) {
  playerHcp=playingHcp(playerHcp); lowestHcp=playingHcp(lowestHcp);
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
  const quota=36-playingHcp(player.handicap);
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
  const [chatMsg,setChatMsg]=useState(null);
  const [chatOpen,setChatOpen]=useState(false);
  const [chatInput,setChatInput]=useState("");

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
      if(snap.exists()){const d=snap.data();if(d.players)setPlayers(d.players);if(d.teams)setTeams(d.teams);if(d.course)setCourse(d.course);if(d.closestPin!==undefined)setClosestPin(d.closestPin||{});if(d.longestDrive!==undefined)setLongestDrive(d.longestDrive);
        if(d.lastPickup&&d.lastPickup.ts&&d.lastPickup.ts!==window._lastPickupTs){
          window._lastPickupTs=d.lastPickup.ts;
          const isPickupAlert=d.lastPickup.playerName&&d.lastPickup.playerName!=='';
          const msg=isPickupAlert?d.lastPickup.playerName+' en hoyo '+d.lastPickup.hole+': '+d.lastPickup.phrase:d.lastPickup.phrase;
          setNotification({msg,type:isPickupAlert?"pickup":"score"});
        }}
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
  if(screen==="admin")return <AdminScreen players={players} setPlayers={setPlayers} teams={teams} setTeams={setTeams} course={course} setCourse={setCourse} scores={scores} setScores={setScores} onLogout={()=>setScreen("login")} generateTeams={generateTeams} showNotif={showNotif} updateTournament={updateTournament} db={db} setScreen={setScreen}/>;

  if(screen==="home"&&currentPlayer){
    const team=getTeam(currentPlayer.id);
    const stats=getTotalStats(currentPlayer,scores,course,players);
    return(<div style={S.app}><Notification data={notification} onDismiss={()=>setNotification(null)}/>{syncing&&<SyncBadge/>}<div style={{padding:"1.5rem 1rem 5rem"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}><div><div style={S.h1}>{course.name}</div><div style={{...S.muted,display:"flex",alignItems:"center",gap:6}}><span style={{width:7,height:7,borderRadius:"50%",background:"#4ade80",display:"inline-block"}}/>Live</div></div><button onClick={()=>{setCurrentPlayer(null);setScreen("login");}} style={S.btnSm("#2a4030","#7a9080")}>Logout</button></div><div style={{...S.cardGold,marginBottom:"1rem",display:"flex",gap:12,alignItems:"center"}}><Avatar player={currentPlayer} size={52}/><div><div style={{fontSize:20,fontWeight:700,color:"#e8c84a"}}>Bienvenido, {currentPlayer.name}!</div><div style={{color:"#8fa898",fontSize:14}}>{team?.name} - HCP {currentPlayer.handicap}</div></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:"1rem"}}><StatCard label="Stableford" value={stats.stableford} unit="pts"/><StatCard label="Quota" value={(stats.quotaPos>=0?"+":"")+stats.quotaPos} unit={"de "+stats.quota}/><StatCard label="Hoyos" value={stats.holesPlayed+"/"+course.holes} unit="jugados"/><StatCard label="Gross" value={stats.holesPlayed>0?stats.totalGross:""} unit="golpes"/></div><button onClick={()=>setScreen("scorecard")} style={{...S.btn(),marginBottom:"1rem",fontSize:17,padding:16}}>⛳ Ingresar Scores</button><button onClick={()=>setScreen("leaderboard")} style={{...S.btn("#1a2e1e","#e8c84a"),marginBottom:"1rem",border:"1px solid #b8962e"}}>🏆🏆 Leaderboard en Vivo</button><div style={{...S.card,marginBottom:"1rem"}}><div style={{...S.h3,marginBottom:12}}>Premios Especiales</div><SpecialAwards players={players} closestPin={closestPin} longestDrive={longestDrive} setClosestPin={cp=>{setClosestPin(cp);updateTournament({closestPin:cp});}} setLongestDrive={ld=>{setLongestDrive(ld);updateTournament({longestDrive:ld});}} currentPlayer={currentPlayer} course={course} showNotif={showNotif}/></div></div><ChatBanner msg={chatMsg}/><ChatInput player={currentPlayer} onSend={sendChat} open={chatOpen} setOpen={setChatOpen} value={chatInput} setValue={setChatInput}/><ChatBanner msg={chatMsg}/><ChatInput player={currentPlayer} onSend={sendChat} open={chatOpen} setOpen={setChatOpen} value={chatInput} setValue={setChatInput}/><BottomNav screen="home" setScreen={setScreen}/></div>);
  }

  if(screen==="scorecard"&&currentPlayer)return <ScorecardScreen currentPlayer={currentPlayer} players={players} course={course} scores={scores} updateScore={updateScore} updateTournament={updateTournament} scoringHole={scoringHole} setScoringHole={setScoringHole} onBack={()=>setScreen("home")} showNotif={showNotif} syncing={syncing} setScreen={setScreen} chatMsg={chatMsg} chatOpen={chatOpen} setChatOpen={setChatOpen} chatInput={chatInput} setChatInput={setChatInput} sendChat={sendChat} setScreen={setScreen} onScoreAlert={(msg)=>{updateTournament({lastPickup:{playerName:'',phrase:msg,hole:0,ts:Date.now()}});setNotification({msg,type:"score"});}} />;

  if(screen==="leaderboard")return(<div style={S.app}><Notification data={notification} onDismiss={()=>setNotification(null)}/>{syncing&&<SyncBadge/>}<div style={{padding:"1.5rem 1rem 5rem"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}><div style={S.h1}>Leaderboard</div><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{width:8,height:8,borderRadius:"50%",background:"#4ade80",display:"inline-block"}}/><span style={{...S.muted,fontSize:11}}>LIVE</span><button onClick={()=>setScreen("home")} style={S.btnSm("#2a4030","#7a9080")}>Atrs</button></div></div><div style={{display:"flex",gap:8,background:"#0f1f14",borderRadius:12,padding:4,marginBottom:"1rem"}}>{["individual","teams","scorecard"].map(t=>(<button key={t} style={S.tab(activeTab===t)} onClick={()=>setActiveTab(t)}>{t==="individual"?"Individual":t==="teams"?"Equipos":"Scorecard"}</button>))}</div>{activeTab==="individual"&&<IndividualLeaderboard players={players} scores={scores} course={course} teams={teams}/>}{activeTab==="teams"&&<TeamLeaderboard teams={teams} players={players} scores={scores} course={course}/>}{activeTab==="scorecard"&&<FullScorecard players={players} scores={scores} course={course} currentPlayer={currentPlayer}/>}</div><ChatBanner msg={chatMsg}/><ChatInput player={currentPlayer} onSend={sendChat} open={chatOpen} setOpen={setChatOpen} value={chatInput} setValue={setChatInput}/><BottomNav screen="leaderboard" setScreen={setScreen}/></div>);

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

function AdminScreen({players,setPlayers,teams,setTeams,course,setCourse,scores,setScores,onLogout,generateTeams,showNotif,updateTournament,db,setScreen}){
  const [tab,setTab]=useState("players");
  const [np,setNp]=useState({name:"",handicap:"",pin:"",color:"#1a6b3c"});
  const [editingId,setEditingId]=useState(null);
  const [ce,setCe]=useState(course);
  const COLORS=["#1a6b3c","#2563eb","#7c3aed","#db2777","#d97706","#dc2626","#0891b2","#65a30d","#059669"];
  useEffect(()=>{ setCe(prev => JSON.stringify(prev)===JSON.stringify(course)?prev:{...course}); },[JSON.stringify(course)]);
  const add=()=>{if(!np.name||!np.handicap||!np.pin)return;const p={...np,id:"p"+Date.now(),handicap:parseInt(np.handicap),initials:np.name.slice(0,2).toUpperCase()};const u=[...players,p];const t=generateTeams(u);setPlayers(u);setTeams(t);updateTournament({players:u,teams:t});setNp({name:"",handicap:"",pin:"",color:"#1a6b3c"});showNotif(p.name+" agregado!");};
  const remove=(id)=>{const u=players.filter(p=>p.id!==id);const t=generateTeams(u);setPlayers(u);setTeams(t);updateTournament({players:u,teams:t});};
  const saveC=()=>{setCourse(ce);updateTournament({course:ce});showNotif("Cancha guardada!");};
  const regen=()=>{const t=generateTeams(players);setTeams(t);updateTournament({teams:t});showNotif("Equipos regenerados!");};
  const reset=async()=>{setScores({});const snap=await getDocs(collection(db,"scores"));const b=writeBatch(db);snap.forEach(d=>b.delete(d.ref));await b.commit();showNotif("Scores reiniciados!");};
  const startEdit=(p)=>{ setEditingId(p.id); setNp({name:p.name,handicap:String(p.handicap),pin:p.pin,color:p.color||"#1a6b3c"}); setTab("players"); };
  const saveEdit=()=>{ if(!np.name||!np.handicap||!np.pin)return; const updated=players.map(p=>p.id===editingId?{...p,name:np.name,handicap:parseInt(np.handicap),pin:np.pin,color:np.color,initials:np.name.slice(0,2).toUpperCase()}:p); const newTeams=generateTeams(updated); setPlayers(updated); setTeams(newTeams); updateTournament({players:updated,teams:newTeams}); setEditingId(null); setNp({name:"",handicap:"",pin:"",color:"#1a6b3c"}); showNotif("Jugador actualizado!"); };
  const updatePar=(i,val)=>setCe(c=>{const p=[...c.pars];p[i]=parseInt(val)||4;return{...c,pars:p};});
  const updateSI=(i,val)=>setCe(c=>{const s=[...c.strokeIndex];s[i]=parseInt(val)||i+1;return{...c,strokeIndex:s};});
  return(<div style={S.app}><div style={{padding:"1.5rem 1rem 5rem"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}><div><div style={S.h1}>Admin</div><div style={S.muted}>ForeAmigos</div></div><button onClick={onLogout} style={S.btnSm("#2a4030","#f87171")}>Logout</button></div><div style={{display:"flex",gap:6,background:"#0f1f14",borderRadius:12,padding:4,marginBottom:"1rem"}}>{["players","teams","course","danger"].map(t=>(<button key={t} style={S.tab(tab===t)} onClick={()=>setTab(t)}>{t==="players"?"Jugadores":t==="teams"?"Equipos":t==="course"?"Cancha":""}</button>))}</div>{tab==="players"&&(<div><div style={{...S.card,marginBottom:"1rem"}}><div style={{...S.h3,marginBottom:12}}>{editingId?"Editar Jugador":"Agregar Jugador"}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}><div><label style={S.label}>Nombre</label><input style={S.input} value={np.name} onChange={e=>setNp(p=>({...p,name:e.target.value}))} placeholder="Nombre"/></div><div><label style={S.label}>HCP</label><input style={S.input} type="number" value={np.handicap} onChange={e=>setNp(p=>({...p,handicap:e.target.value}))} placeholder="0-54"/></div></div><div style={{marginBottom:8}}><label style={S.label}>PIN</label><input style={S.input} type="password" value={np.pin} onChange={e=>setNp(p=>({...p,pin:e.target.value}))} placeholder="1234" maxLength={4}/></div><div style={{marginBottom:12}}><label style={S.label}>Color</label><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{COLORS.map(c=><div key={c} onClick={()=>setNp(p=>({...p,color:c}))} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:np.color===c?"3px solid #e8c84a":"3px solid transparent"}}/>)}</div></div><div style={{display:"flex",gap:8}}><button onClick={editingId?saveEdit:add} style={{...S.btn(),flex:1}}>{editingId?"Guardar":"Agregar"}</button>{editingId&&<button onClick={()=>{setEditingId(null);setNp({name:"",handicap:"",pin:"",color:"#1a6b3c"});}} style={{...S.btn("#2a4030","#8fa898"),flex:1}}>Cancelar</button>}</div></div>{players.map(p=>(<div key={p.id} style={{...S.card,marginBottom:8,display:"flex",alignItems:"center",gap:12,border:editingId===p.id?"1px solid #e8c84a":"1px solid #2a4030"}}><Avatar player={p} size={40}/><div style={{flex:1}}><div style={{fontWeight:600}}>{p.name}</div><div style={S.muted}>HCP {p.handicap} - PIN: {p.pin} - Juega HCP {playingHcp(p.handicap)}</div></div><div style={{display:"flex",gap:6,flexShrink:0}}><button onClick={()=>startEdit(p)} style={S.btnSm("#1a3d2a","#4ade80")}>Editar</button><button onClick={()=>remove(p.id)} style={S.btnSm("#4a1a1a","#f87171")}>X</button></div></div>))}</div>)}{tab==="teams"&&(<div><button onClick={regen} style={{...S.btn(),marginBottom:"1rem"}}>🔀🔀 Regenerar</button>{teams.map(t=>(<div key={t.id} style={{...S.card,marginBottom:12,borderLeft:"4px solid "+t.color}}><div style={{fontWeight:700,color:t.color,marginBottom:8}}>{t.name}</div>{t.members.map(mid=>{const p=players.find(x=>x.id===mid);return p?(<div key={mid} style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}><Avatar player={p} size={32}/><span>{p.name}</span><span style={{...S.muted,marginLeft:"auto"}}>HCP {p.handicap}</span></div>):null;})}</div>))}</div>)}{tab==="course"&&(<div style={S.card}><label style={S.label}>Nombre de la Cancha</label><input style={{...S.input,marginBottom:12}} value={ce.name||""} onChange={e=>setCe(c=>({...c,name:e.target.value}))} placeholder="Ej: Club de Golf Monterrey"/><label style={S.label}>Nmero de Hoyos</label><div style={{display:"flex",gap:8,marginBottom:16}}>{[9,18].map(n=><button key={n} onClick={()=>setCe(c=>({...c,holes:n,pars:Array(n).fill(4),strokeIndex:Array.from({length:n},(_,i)=>i+1)}))} style={{...S.btnSm(ce.holes===n?"#1a6b3c":"#1a2e1e","#f0ede4"),flex:1,padding:"12px"}}>{n} Hoyos</button>)}</div><div style={{overflowX:"auto",marginBottom:16}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr><th style={{color:"#8fa898",padding:"6px 8px",textAlign:"left"}}>Hoyo</th>{Array.from({length:ce.holes||9},(_,i)=><th key={i} style={{color:"#e8c84a",padding:"4px 2px",textAlign:"center",minWidth:44,fontWeight:700}}>{i+1}</th>)}</tr></thead><tbody><tr style={{borderBottom:"1px solid #2a4030"}}><td style={{color:"#8fa898",padding:"8px",fontWeight:600}}>Par</td>{Array.from({length:ce.holes||9},(_,i)=>(<td key={i} style={{padding:"4px 2px"}}><input type="number" min={3} max={5} value={ce.pars?.[i]??4} onChange={e=>updatePar(i,e.target.value)} onFocus={e=>e.target.select()} style={{background:"#0f1f14",border:"1px solid #2a4030",borderRadius:6,padding:"8px 2px",color:"#f0ede4",fontSize:14,width:40,textAlign:"center",boxSizing:"border-box"}}/></td>))}</tr><tr><td style={{color:"#8fa898",padding:"8px",fontWeight:600}}>SI</td>{Array.from({length:ce.holes||9},(_,i)=>(<td key={i} style={{padding:"4px 2px"}}><input type="number" min={1} max={ce.holes||9} value={ce.strokeIndex?.[i]??i+1} onChange={e=>updateSI(i,e.target.value)} onFocus={e=>e.target.select()} style={{background:"#0f1f14",border:"1px solid #2a4030",borderRadius:6,padding:"8px 2px",color:"#f0ede4",fontSize:14,width:40,textAlign:"center",boxSizing:"border-box"}}/></td>))}</tr></tbody></table></div><button onClick={saveC} style={S.btn()}>🔀Save Guardar Cancha</button></div>)}{tab==="danger"&&(<div style={{...S.card,border:"1px solid #4a1a1a"}}><div style={{...S.h3,color:"#f87171",marginBottom:12}}>Zona de Peligro</div><div style={{...S.muted,marginBottom:16}}>Esta accin no se puede deshacer.</div><button onClick={reset} style={S.btn("#4a1a1a","#f87171")}>🔀Delete Reiniciar Todos los Scores</button></div>)}<BottomNav screen="admin" setScreen={setScreen}/></div></div>);
}

function ScorecardScreen({currentPlayer,players,course,scores,updateScore,updateTournament,scoringHole,setScoringHole,onBack,showNotif,syncing,onScoreAlert,setScreen,chatMsg,chatOpen,setChatOpen,chatInput,setChatInput,sendChat}){
  const lowestHcp=Math.min(...players.map(p=>p.handicap));
  const myStrokes=calcHandicapStrokes(currentPlayer.handicap,lowestHcp,course.strokeIndex,course.holes);
  const myScores=scores[currentPlayer.id]||{};
  const par=course.pars[scoringHole],stroke=myStrokes[scoringHole],cv=myScores[scoringHole]??"";
  const sf=calcStableford(cv,par,stroke);
  const stats=getTotalStats(currentPlayer,scores,course,players);
  const fireScorePhrase=(gross,holeIdx)=>{
    const hStrokes=myStrokes[holeIdx];
    const hPar=course.pars[holeIdx];
    const pts=calcStableford(gross,hPar,hStrokes);
    if(pts===null)return;
    const isPickupVal=parseInt(gross)>=getPickupScore(hPar,hStrokes);
    if(isPickupVal)return;
    const phrase=getScorePhrase(pts,currentPlayer.name);
    if(onScoreAlert)onScoreAlert(phrase);
  };
  const sc=(g,par,s)=>{if(g===""||g===null||g===undefined)return"#7a9080";const n=parseInt(g)-s,d=par-n;return d>=2?"#e8c84a":d>=1?"#4ade80":d===0?"#f0ede4":"#f87171";};
  const sl=(p)=>{if(p===null)return"";if(p>=4)return"guila";if(p===3)return"Birdie";if(p===2)return"Par";if(p===1)return"Bogey";return"Sin pts";};
  return(<div style={S.app}>{syncing&&<SyncBadge/>}<div style={{padding:"1rem 1rem 6rem"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}><button onClick={onBack} style={S.btnSm("#2a4030","#8fa898")}> Atrs</button><div style={{textAlign:"center"}}><div style={{fontWeight:700,color:"#e8c84a"}}>{currentPlayer.name}</div><div style={S.muted}>HCP {currentPlayer.handicap}</div></div><div style={{...S.muted,fontSize:13}}>{course.holes}H</div></div><div style={{display:"flex",gap:8,marginBottom:10}}>
      <button onClick={()=>setScoringHole(h=>Math.max(0,h-1))} disabled={scoringHole===0} style={{flex:1,background:"#1a2e1e",border:"1px solid #2a4030",borderRadius:10,padding:"9px",color:scoringHole===0?"#2a4030":"#8fa898",fontWeight:600,fontSize:13,cursor:scoringHole===0?"default":"pointer"}}>Hoyo anterior</button>
      <button onClick={()=>{const g=myScores[scoringHole];if(g!==undefined&&g!==""){const pts=calcStableford(g,par,stroke);const isP=parseInt(g)>=getPickupScore(par,stroke);if(!isP&&pts!==null&&onScoreAlert)onScoreAlert(getScorePhrase(pts,currentPlayer.name),"score");}if(scoringHole<course.holes-1)setScoringHole(h=>h+1);else{showNotif("Ronda completa!");onBack();}}} style={{flex:1,background:"#1a6b3c",border:"none",borderRadius:10,padding:"9px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"}}>{scoringHole<course.holes-1?"Siguiente hoyo":"Terminar ronda"}</button>
    </div>
    <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:"1rem"}}>{Array.from({length:course.holes},(_,i)=>{const g=myScores[i],played=g!==undefined&&g!=="",c=played?sc(g,course.pars[i],myStrokes[i]):"#2a4030";return(<button key={i} onClick={()=>setScoringHole(i)} style={{minWidth:36,height:36,borderRadius:8,background:scoringHole===i?"#e8c84a":"#1a2e1e",color:scoringHole===i?"#0f1f14":c,border:played?"1px solid "+c:"1px solid #2a4030",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0}}>{i+1}</button>);})}</div><div style={{...S.cardGold,marginBottom:"1rem",textAlign:"center"}}><div style={{fontSize:13,color:"#8fa898",marginBottom:4}}>HOYO {scoringHole+1}</div><div style={{display:"flex",justifyContent:"center",gap:24,marginBottom:8}}><div><div style={S.muted}>Par</div><div style={{fontSize:22,fontWeight:700}}>{par}</div></div><div><div style={S.muted}>SI</div><div style={{fontSize:22,fontWeight:700}}>{course.strokeIndex[scoringHole]}</div></div><div><div style={S.muted}>Golpes</div><div style={{fontSize:22,fontWeight:700,color:"#e8c84a"}}>{stroke>0?"+"+stroke:"0"}</div></div></div><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:8}}><button onClick={()=>{const v=parseInt(cv)||par;const ns=Math.max(1,v-1);updateScore(currentPlayer.id,scoringHole,ns);fireScorePhrase(ns,scoringHole);}} style={{width:52,height:52,borderRadius:26,background:"#2a4030",border:"none",color:"#f0ede4",fontSize:24,cursor:"pointer",fontWeight:700}}></button><div style={{fontSize:56,fontWeight:800,color:sc(cv,par,stroke),minWidth:64,textAlign:"center"}}>{cv===""?"":cv}</div><button onClick={()=>{const v=parseInt(cv)||(par-1);const ns=v+1;updateScore(currentPlayer.id,scoringHole,ns);fireScorePhrase(ns,scoringHole);}} style={{width:52,height:52,borderRadius:26,background:"#2a4030",border:"none",color:"#f0ede4",fontSize:24,cursor:"pointer",fontWeight:700}}>+</button></div>{sf!==null&&<div style={{background:"#0f1f14",borderRadius:8,padding:"6px 16px",display:"inline-block"}}><span style={{color:"#e8c84a",fontWeight:700}}>{sf} pts</span><span style={{color:"#8fa898",marginLeft:8,fontSize:13}}>{sl(sf)}</span></div>}
    <button onClick={()=>{const ps=getPickupScore(par,stroke);updateScore(currentPlayer.id,scoringHole,ps);const msg=currentPlayer.name+" recogió su pelota 🏳️‍🌈";const al={msg,type:"pickup",ts:Date.now()};if(!window._seenAlerts)window._seenAlerts=new Set();window._seenAlerts.add(al.ts);if(!window._alertQueue)window._alertQueue=[];window._alertQueue.unshift(al);if(!window._alertPlaying)processAlertQueue(setNotification);updateTournament({lastAlert:{msg,type:"pickup",ts:al.ts}});}} style={{background:"#3d2000",color:"#fbbf24",border:"1px solid #fbbf24",borderRadius:10,padding:"10px 16px",fontWeight:700,fontSize:13,cursor:"pointer",marginTop:10,width:"100%"}}>Recoger pelota</button>
    <div style={{display:"flex",gap:8,marginTop:12}}>{[par-1,par,par+1,par+2].map(v=>(<button key={v} onClick={()=>{updateScore(currentPlayer.id,scoringHole,v);fireScorePhrase(v,scoringHole);}} style={{flex:1,padding:"10px 4px",borderRadius:8,background:parseInt(cv)===v?"#1a6b3c":"#1a2e1e",border:"1px solid #2a4030",color:parseInt(cv)===v?"#fff":"#8fa898",fontWeight:600,fontSize:14,cursor:"pointer"}}>{v}</button>))}</div></div><div style={{...S.card,marginBottom:"1rem"}}><div style={{...S.h3,marginBottom:8}}>Mi Ronda</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>{[{l:"Gross",v:stats.totalGross||""},{l:"SF",v:stats.stableford+"pts"},{l:"Quota",v:(stats.quotaPos>=0?"+":"")+stats.quotaPos}].map(({l,v})=>(<div key={l} style={{background:"#0f1f14",borderRadius:8,padding:8,textAlign:"center"}}><div style={{...S.muted,fontSize:11}}>{l}</div><div style={{fontWeight:700,fontSize:15,color:"#e8c84a"}}>{v}</div></div>))}</div></div><div style={{...S.h3,marginBottom:8}}>Otros</div>{players.filter(p=>p.id!==currentPlayer.id).map(p=>{const ps=scores[p.id]||{},ps2=calcHandicapStrokes(p.handicap,lowestHcp,course.strokeIndex,course.holes),g=ps[scoringHole],psf=calcStableford(g,course.pars[scoringHole],ps2[scoringHole]);return(<div key={p.id} style={{...S.card,marginBottom:8,display:"flex",alignItems:"center",gap:12,opacity:0.8}}><Avatar player={p} size={36}/><div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{p.name}</div><div style={S.muted}> Solo lectura</div></div><div style={{textAlign:"right"}}><div style={{fontWeight:700,fontSize:18,color:g?sc(g,course.pars[scoringHole],ps2[scoringHole]):"#2a4030"}}>{g||""}</div>{psf!==null&&<div style={{fontSize:12,color:"#8fa898"}}>{psf}pts</div>}</div></div>);})}<div style={{display:"flex",gap:8,marginTop:"1rem"}}><button onClick={()=>setScoringHole(h=>Math.max(0,h-1))} disabled={scoringHole===0} style={{...S.btn("#1a2e1e","#8fa898"),flex:1}}> Anterior</button><button onClick={()=>{if(scoringHole<course.holes-1)setScoringHole(h=>h+1);else{showNotif("Ronda completa! ");onBack();}}} style={{...S.btn(),flex:1}}>{scoringHole<course.holes-1?"Siguiente ":"Terminar "}</button></div></div><ChatBanner msg={chatMsg}/><ChatInput player={currentPlayer} onSend={sendChat} open={chatOpen} setOpen={setChatOpen} value={chatInput} setValue={setChatInput}/><BottomNav screen="scorecard" setScreen={(s)=>{if(s!=="scorecard")setScreen(s);}}/></div>);
}


function getHoleScores(player,scores,course,allPlayers){
  const lowestHcp=allPlayers?.length?Math.min(...allPlayers.map(p=>p.handicap)):player.handicap;
  const strokes=calcHandicapStrokes(player.handicap,lowestHcp,course.strokeIndex,course.holes);
  const ps=scores[player.id]||{};const holes=[];
  for(let h=0;h<course.holes;h++){const g=ps[h];if(g!==undefined&&g!==''){const sf=calcStableford(g,course.pars[h],strokes[h]);const netDiff=parseInt(g)-strokes[h]-course.pars[h];holes.push({hole:h,gross:parseInt(g),par:course.pars[h],strokes:strokes[h],sf,netDiff});}}
  return holes;
}
function getMorale(holes){
  if(!holes.length)return{label:'Calm',level:0,color:'#6b7280'};
  const recent=holes.slice(-3);const recentSF=recent.reduce((s,h)=>s+(h.sf||0),0);
  const totalSF=holes.reduce((s,h)=>s+(h.sf||0),0);const avgSF=totalSF/holes.length;
  const badRun=recent.filter(h=>h.sf===0).length;const lastSF=holes[holes.length-1]?.sf||0;
  if(badRun>=3)return{label:'Beyond Analytics',level:6,color:'#7f1d1d'};
  if(badRun>=2&&lastSF===0)return{label:'Spiraling',level:5,color:'#991b1b'};
  if(badRun>=2)return{label:'Critical',level:4,color:'#b91c1c'};
  if(avgSF<1.2&&holes.length>3)return{label:'Silent',level:3,color:'#92400e'};
  if(avgSF<1.5&&holes.length>2)return{label:'Unstable',level:2,color:'#b45309'};
  if(recentSF<3&&holes.length>2)return{label:'Irritated',level:1,color:'#d97706'};
  if(avgSF>=2.5)return{label:'Focused',level:-1,color:'#059669'};
  return{label:'Stable',level:0,color:'#6b7280'};
}
function getStatus(holes){
  if(!holes.length)return'Warming Up';
  const last=holes[holes.length-1];const totalSF=holes.reduce((s,h)=>s+(h.sf||0),0);const avgSF=totalSF/holes.length;
  const recent=holes.slice(-3);const recentSF=recent.reduce((s,h)=>s+(h.sf||0),0);
  let s0=0;for(let i=holes.length-1;i>=0;i--){if(holes[i].sf===0)s0++;else break;}
  let sG=0;for(let i=holes.length-1;i>=0;i--){if(holes[i].sf>=2)sG++;else break;}
  if(s0>=3)return'Mentally Offline';
  if(s0>=2)return'Fighting Demons';
  if(s0===1&&last.sf===0)return'Round Deteriorating';
  if(sG>=3)return'Dangerously Hopeful';
  if(sG>=2)return'Unexpected Momentum';
  if(avgSF<1&&holes.length>3)return'Emotionally Unavailable';
  if(avgSF<1.3&&holes.length>3)return'Searching for Answers';
  if(last.sf>=3)return'Holding It Together';
  if(holes.length>=7&&avgSF<1.5)return'One Hole From Collapse';
  if(holes.length>=5&&recentSF<3)return'Under Pressure';
  return'Stable';
}
function getCommentary(holes,rank,total){
  if(!holes.length)return null;
  const last=holes[holes.length-1];const prev=holes[holes.length-2];
  const totalSF=holes.reduce((s,h)=>s+(h.sf||0),0);const avgSF=totalSF/holes.length;
  const n=holes.length;const isLast=rank===total;
  let s0=0;for(let i=holes.length-1;i>=0;i--){if(holes[i].sf===0)s0++;else break;}
  let sG=0;for(let i=holes.length-1;i>=0;i--){if(holes[i].sf>=2)sG++;else break;}
  if(last.sf>=4)return'An exceptional outcome. The group adjusts its expectations accordingly.';
  if(last.sf===3&&prev?.sf===0)return'A response. Whether it changes anything remains to be seen.';
  if(sG>=3)return'Temporary Professional Golfer mode engaged.';
  if(last.sf===3)return'Progress noted. The round continues to be monitored.';
  if(last.netDiff>=3)return'Round integrity compromised.';
  if(last.netDiff===2)return'An ambitious decision that did not conclude as planned.';
  if(s0>=3)return'The situation continues to develop.';
  if(s0>=2)return'Momentum unavailable at this time.';
  if(isLast&&n>3)return'The leaderboard reflects recent events.';
  if(n>=7&&avgSF<1.5&&last.sf===0)return'Late round panic setting in.';
  if(n>=7&&avgSF<1.5)return'A difficult stretch for the player.';
  if(last.sf===0)return'Confidence declining steadily.';
  if(last.sf===2)return'Stability maintained. For now.';
  if(n>5&&avgSF>2&&last.sf===0)return'This round has entered a new phase.';
  return null;
}
function getAchievements(holes){
  if(holes.length<2)return[];const achievements=[];
  const totalSF=holes.reduce((s,h)=>s+(h.sf||0),0);const avgSF=totalSF/holes.length;
  const front=holes.slice(0,Math.min(5,holes.length));const back=holes.slice(Math.max(0,holes.length-4));
  const frontAvg=front.reduce((s,h)=>s+(h.sf||0),0)/front.length;
  const backAvg=back.length?back.reduce((s,h)=>s+(h.sf||0),0)/back.length:null;
  let s0=0;for(let i=holes.length-1;i>=0;i--){if(holes[i].sf===0)s0++;else break;}
  if(s0>=3)achievements.push('Public Meltdown');
  for(let i=1;i<holes.length;i++){if(holes[i-1].netDiff>=3&&holes[i].sf>=3){achievements.push('Back From the Dead');break;}}
  if(holes.length>=7&&frontAvg>=2.2&&backAvg!==null&&backAvg<1.2)achievements.push('Hope Was a Mistake');
  const consGood=holes.reduce((max,_,i)=>{let cc=0;for(let j=i;j<holes.length;j++){if(holes[j].sf>=2)cc++;else break;}return Math.max(max,cc);},0);
  if(consGood>=3)achievements.push('Temporary Professional Golfer');
  if(holes.slice(0,3).every(h=>h.sf<=1)&&holes.slice(-3).every(h=>h.sf>=2)&&holes.length>=6)achievements.push('Character Development');
  if(holes.some(h=>h.netDiff>=3)&&totalSF>5)achievements.push('Not Technically Giving Up');
  if(avgSF<1.2&&holes.length>=5&&totalSF>0)achievements.push('Still Mathematically Alive');
  if(holes.length>=6&&avgSF<1.5&&holes[holes.length-1].sf>=3)achievements.push('Against All Evidence');
  if(holes.length>=8&&frontAvg>2&&backAvg!==null&&backAvg<1)achievements.push('Strong Start, Difficult Finish');
  const consBad=holes.reduce((max,_,i)=>{let cc=0;for(let j=i;j<holes.length;j++){if(holes[j].sf===0)cc++;else break;}return Math.max(max,cc);},0);
  if(consBad>=2&&holes[holes.length-1].sf>=2)achievements.push('The Rebuild');
  return[...new Set(achievements)];
}
function getSideRankings(players,scores,course){
  const data=players.map(p=>{
    const holes=getHoleScores(p,scores,course,players);if(!holes.length)return null;
    const sfs=holes.map(h=>h.sf||0);const diffs=sfs.slice(1).map((s,i)=>Math.abs(s-sfs[i]));
    const volatility=diffs.reduce((a,b)=>a+b,0);
    const consBad=holes.reduce((max,_,i)=>{let cc=0;for(let j=i;j<holes.length;j++){if(holes[j].sf===0)cc++;else break;}return Math.max(max,cc);},0);
    const front=holes.slice(0,Math.min(5,holes.length));const back=holes.slice(Math.max(0,holes.length-4));
    const frontAvg=front.reduce((s,h)=>s+(h.sf||0),0)/front.length;
    const backAvg=back.length?back.reduce((s,h)=>s+(h.sf||0),0)/back.length:null;
    const bestRecovery=holes.some((_,i)=>i>0&&holes[i-1].netDiff>=2&&holes[i].sf>=3);
    return{p,holes,volatility,consBad,frontAvg,backAvg,bestRecovery};
  }).filter(Boolean);
  if(!data.length)return[];const r=[];
  const byVol=[...data].sort((a,b)=>b.volatility-a.volatility);if(byVol[0]?.volatility>2)r.push({label:'Most Volatile Round',player:byVol[0].p.name});
  const bestRec=data.filter(d=>d.bestRecovery);if(bestRec.length)r.push({label:'Best Recovery',player:bestRec[0].p.name});
  const byBad=[...data].sort((a,b)=>b.consBad-a.consBad);if(byBad[0]?.consBad>=2)r.push({label:'Fastest Collapse',player:byBad[0].p.name});
  const ss=data.filter(d=>d.frontAvg>2&&d.backAvg!==null&&d.backAvg<1.5).sort((a,b)=>(b.frontAvg-b.backAvg)-(a.frontAvg-a.backAvg));if(ss[0])r.push({label:'Strong Start, Difficult Finish',player:ss[0].p.name});
  const lp=data.filter(d=>d.backAvg!==null&&d.backAvg<1&&d.frontAvg>=1.5);if(lp.length)r.push({label:'Late Round Panic',player:lp[0].p.name});
  return r;
}

function IndividualLeaderboard({players,scores,course,teams}){
  const ranked=players.map(p=>{
    const s=getTotalStats(p,scores,course,players);
    const holes=getHoleScores(p,scores,course,players);
    const morale=getMorale(holes);
    const status=getStatus(holes);
    const achievements=getAchievements(holes);
    return{...p,...s,team:teams.find(t=>t.members.includes(p.id)),holes,morale,status,achievements};
  }).sort((a,b)=>b.quotaPos-a.quotaPos);
  const side=getSideRankings(players,scores,course);
  return(
    <div>
      {ranked.map((p,i)=>{
        const commentary=getCommentary(p.holes,i+1,players.length);
        return(
          <div key={p.id} style={{...S.card,marginBottom:10,borderLeft:i===0?"3px solid #e8c84a":"1px solid #2a4030"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontSize:16,fontWeight:800,color:i===0?"#e8c84a":i===1?"#9ca3af":i===2?"#92400e":"#374151",minWidth:24,textAlign:"center"}}>{i+1}</div>
              <Avatar player={p} size={34}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontWeight:700,fontSize:14}}>{p.name}</span>
                  <span style={{fontSize:9,color:p.morale.color,background:p.morale.color+'18',padding:"1px 6px",borderRadius:20,fontWeight:600,letterSpacing:0.3,whiteSpace:"nowrap"}}>{p.status}</span>
                </div>
                <div style={{fontSize:11,color:"#4a6050"}}>{p.team?.name} - HCP {p.handicap}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontWeight:800,fontSize:17,color:p.quotaPos>0?"#4ade80":p.quotaPos<0?"#f87171":"#f0ede4"}}>{p.holesPlayed>0?(p.quotaPos>=0?"+":"")+p.quotaPos:"-"}</div>
                <div style={{fontSize:11,color:"#4a6050"}}>{p.stableford}pts</div>
              </div>
            </div>
            {p.holes.length>0&&(
              <div style={{marginTop:7,paddingTop:7,borderTop:"1px solid #0f1f14"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:9,color:"#8fa898",textTransform:"uppercase",letterSpacing:1}}>Morale</span>
                  <span style={{fontSize:9,color:p.morale.color,fontWeight:700}}>{p.morale.label}</span>
                </div>
                <div style={{height:2,background:"#0f1f14",borderRadius:1}}>
                  <div style={{height:"100%",width:Math.max(4,100-Math.max(0,p.morale.level)*16)+'%',background:p.morale.color,borderRadius:1,transition:"width 1s"}}/>
                </div>
              </div>
            )}
            {commentary&&<div style={{marginTop:6,fontSize:11,color:"#8fa898",fontStyle:"italic",lineHeight:1.5}}>{commentary}</div>}
            {p.achievements.length>0&&(
              <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:3}}>
                {p.achievements.map(a=><span key={a} style={{fontSize:9,color:"#4a6050",background:"#0f1f14",padding:"2px 7px",borderRadius:10,border:"1px solid #1a2e1e"}}>{a}</span>)}
              </div>
            )}
          </div>
        );
      })}
      {side.length>0&&(
        <div style={{marginTop:16,paddingTop:12,borderTop:"1px solid #1a2e1e"}}>
          <div style={{fontSize:9,color:"#8fa898",textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>Analysis</div>
          {side.map((r,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #0f1f14"}}>
              <span style={{fontSize:11,color:"#8fa898"}}>{r.label}</span>
              <span style={{fontSize:11,color:"#c8d9c0",fontWeight:600}}>{r.player}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{fontSize:10,color:"#4a6050",textAlign:"center",marginTop:12}}>Ordenado por cuota</div>
    </div>
  );
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

function ChatBanner({msg}){
  if(!msg)return null;
  return(
    <div style={{position:"fixed",bottom:64,left:0,right:0,zIndex:150,padding:"0 12px",pointerEvents:"none"}}>
      <div style={{background:"#0f2a1a",border:"1px solid #1a6b3c",borderRadius:12,padding:"8px 14px",display:"flex",gap:8,alignItems:"center",boxShadow:"0 2px 12px rgba(0,0,0,0.4)"}}>
        <div style={{width:6,height:6,borderRadius:"50%",background:"#4ade80",flexShrink:0}}/>
        <span style={{fontSize:12,color:"#4ade80",fontWeight:700,flexShrink:0}}>{msg.name}</span>
        <span style={{fontSize:13,color:"#f0ede4",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{msg.text}</span>
      </div>
    </div>
  );
}

function ChatInput({player,onSend,open,setOpen,value,setValue}){
  if(!player)return null;
  return(
    <div style={{position:"fixed",bottom:60,left:0,right:0,zIndex:140,padding:"0 12px"}}>
      {open?(
        <div style={{background:"#1a2e1e",border:"1px solid #2a4030",borderRadius:12,padding:"8px 10px",display:"flex",gap:8,alignItems:"center"}}>
          <input autoFocus value={value} onChange={e=>setValue(e.target.value.slice(0,80))} onKeyDown={e=>{if(e.key==="Enter"&&value.trim()){onSend(value,player.name);e.preventDefault();}if(e.key==="Escape")setOpen(false);}} placeholder="Di algo al grupo..." style={{flex:1,background:"transparent",border:"none",color:"#f0ede4",fontSize:14,outline:"none"}}/>
          <span style={{fontSize:10,color:"#4a6050",flexShrink:0}}>{value.length}/80</span>
          <button onClick={()=>{if(value.trim())onSend(value,player.name);}} style={{background:"#1a6b3c",border:"none",borderRadius:8,padding:"6px 12px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer",flexShrink:0}}>Enviar</button>
          <button onClick={()=>setOpen(false)} style={{background:"transparent",border:"none",color:"#4a6050",fontSize:16,cursor:"pointer",flexShrink:0,lineHeight:1}}>x</button>
        </div>
      ):(
        <button onClick={()=>setOpen(true)} style={{width:"100%",background:"#1a2e1e",border:"1px solid #2a4030",borderRadius:12,padding:"8px 14px",color:"#4a6050",fontSize:13,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#2a4030",flexShrink:0}}/>
          <span>Di algo al grupo...</span>
        </button>
      )}
    </div>
  );
}

function BottomNav({screen,setScreen}){return(<div style={{position:"fixed",bottom:0,left:0,right:0,background:"#0a1a0d",borderTop:"1px solid #2a4030",display:"flex",padding:"8px 0 12px",zIndex:100}}>{[{id:"home",icon:"",label:"Inicio"},{id:"scorecard",icon:"⛳",label:"Score"},{id:"leaderboard",icon:"🏆🏆",label:"Board"}].map(it=>(<button key={it.id} onClick={()=>setScreen(it.id)} style={{flex:1,background:"none",border:"none",color:screen===it.id?"#e8c84a":"#4a6050",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><div style={{fontSize:20}}>{it.icon}</div><div style={{fontSize:11,fontWeight:600}}>{it.label}</div></button>))}</div>);}
function Notification({data,onDismiss}){if(!data)return null;const isAlert=data.type==="pickup"||data.type==="score";const bg=data.type==="error"?"#4a1a1a":isAlert?"#0f2a0f":"#1a3d2a";const col=data.type==="error"?"#f87171":isAlert?"#fbbf24":"#4ade80";const bor=data.type==="error"?"#f87171":isAlert?"#fbbf24":"#4ade80";return(<div onClick={isAlert?onDismiss:undefined} style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:bg,color:col,padding:isAlert?"16px 20px":"10px 20px",borderRadius:14,fontWeight:700,fontSize:isAlert?16:14,zIndex:200,border:"2px solid "+bor,maxWidth:"88vw",textAlign:"center",boxShadow:isAlert?"0 4px 24px rgba(251,191,36,0.25)":"none",cursor:isAlert?"pointer":"default",lineHeight:1.4}}>{data.msg}{isAlert&&<div style={{fontSize:11,color:col,opacity:0.7,marginTop:6}}>toca para cerrar</div>}</div>);}