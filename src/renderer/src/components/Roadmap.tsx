import { useState, useRef, useCallback, useEffect } from 'react'
import type { RoadmapNode, RoadmapStatus, RoadmapCheckItem } from '../types'
import { useT } from './LangContext'

// ── Constants ──────────────────────────────────────────────────────────────────
const NW_DEFAULT   = 164
const NH_DEFAULT   = 38
const NH_CL_HDR    = 34
const NH_CL_ITEM   = 26
const NH_CL_ADD    = 28
const GRID         = 20
const ZOOM_MIN     = 0.08
const ZOOM_MAX     = 3.0
const MAX_HIST     = 60
const MM_W = 168, MM_H = 100
const PASTE_OFFSET = 28
const AL = 10, AH = 7

const STATUS_CYCLE: Record<RoadmapStatus, RoadmapStatus> = {
  todo: 'doing', doing: 'done', done: 'todo',
}
const STATUS_ST: Record<RoadmapStatus, { border: string; bg: string; dot: string; label: string }> = {
  todo:  { border: '#2d2d2d', bg: '#161616',               dot: '#505050', label: 'a fazer'      },
  doing: { border: '#fbbf24', bg: 'rgba(251,191,36,0.07)', dot: '#fbbf24', label: 'em andamento' },
  done:  { border: '#a3e635', bg: 'rgba(163,230,53,0.07)', dot: '#a3e635', label: 'feito'        },
}

const PALETTE: (string | null)[] = [null,'#f87171','#fb923c','#fbbf24','#a3e635','#60a5fa','#c084fc']
const PALETTE_NAMES = ['padrão','vermelho','laranja','âmbar','verde','azul','roxo']

function getNodeW(n: RoadmapNode) { return n.w ?? NW_DEFAULT }
function getNodeH(n: RoadmapNode): number {
  if (n.nodeType === 'checklist') {
    return NH_CL_HDR + (n.checkItems?.length ?? 0) * NH_CL_ITEM + NH_CL_ADD
  }
  if (n.nodeType === 'text')  return n.h ?? 100
  if (n.nodeType === 'image') return n.h ?? 120
  if (n.nodeType === 'group') return n.h ?? 160
  return NH_DEFAULT
}
function isResizable(n: RoadmapNode) {
  return n.nodeType === 'text' || n.nodeType === 'image' || n.nodeType === 'group'
}

// ── Routing ────────────────────────────────────────────────────────────────────
type Side = 'right' | 'left' | 'top' | 'bottom'
function getBestPorts(px:number,py:number,ph:number,cx:number,cy:number,ch:number,pw:number,cw:number) {
  const scx = px+pw/2, scy = py+ph/2
  const tcx = cx+cw/2, tcy = cy+ch/2
  const dx = tcx-scx, dy = tcy-scy
  let ss: Side, ts: Side
  if (Math.abs(dx) >= Math.abs(dy)) { ss = dx>=0?'right':'left'; ts = dx>=0?'left':'right' }
  else                               { ss = dy>=0?'bottom':'top'; ts = dy>=0?'top':'bottom' }
  return { sp: sidePoint(px,py,ph,pw,ss), tp: sidePoint(cx,cy,ch,cw,ts), ss, ts }
}
function sidePoint(x:number,y:number,h:number,w:number,s:Side) {
  if (s==='right')  return {x:x+w,  y:y+h/2}
  if (s==='left')   return {x,       y:y+h/2}
  if (s==='bottom') return {x:x+w/2, y:y+h}
                    return {x:x+w/2, y}
}
function bezierD(sp:{x:number;y:number},tp:{x:number;y:number},ss:Side,ts:Side) {
  let ex=tp.x, ey=tp.y
  if (ts==='left')   ex+=AL; if (ts==='right')  ex-=AL
  if (ts==='top')    ey+=AL; if (ts==='bottom') ey-=AL
  const dist = Math.hypot(tp.x-sp.x, tp.y-sp.y)
  const bend = Math.min(dist*0.42, 110)
  let c1x=sp.x,c1y=sp.y,c2x=ex,c2y=ey
  if (ss==='right')  c1x+=bend; if (ss==='left')   c1x-=bend
  if (ss==='bottom') c1y+=bend; if (ss==='top')    c1y-=bend
  if (ts==='left')   c2x+=bend; if (ts==='right')  c2x-=bend
  if (ts==='top')    c2y+=bend; if (ts==='bottom') c2y-=bend
  return `M ${sp.x} ${sp.y} C ${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}`
}
function arrowPts(tp:{x:number;y:number},ts:Side) {
  const {x,y}=tp
  if (ts==='left')   return `${x},${y} ${x+AL},${y-AH} ${x+AL},${y+AH}`
  if (ts==='right')  return `${x},${y} ${x-AL},${y-AH} ${x-AL},${y+AH}`
  if (ts==='top')    return `${x},${y} ${x-AH},${y+AL} ${x+AH},${y+AL}`
                     return `${x},${y} ${x-AH},${y-AL} ${x+AH},${y-AL}`
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function genId()      { return Date.now().toString(36)+Math.random().toString(36).slice(2,5) }
function genCheckId() { return 'ci-'+Date.now().toString(36)+Math.random().toString(36).slice(2,4) }
function clamp(v:number,lo:number,hi:number) { return Math.max(lo,Math.min(hi,v)) }
function snapG(v:number) { return Math.round(v/GRID)*GRID }
function hasCycle(nodes:RoadmapNode[],fromId:string,toId:string) {
  const seen=new Set<string>(); let cur:string|null=fromId
  while(cur) { if(cur===toId) return true; if(seen.has(cur)) break; seen.add(cur); cur=nodes.find(n=>n.id===cur)?.parentId??null }
  return false
}
function bbox(nodes:RoadmapNode[]) {
  if(!nodes.length) return {x:0,y:0,w:400,h:260}
  const xs=nodes.map(n=>n.x), ys=nodes.map(n=>n.y)
  return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)+NW_DEFAULT-Math.min(...xs),h:Math.max(...ys)+NH_DEFAULT-Math.min(...ys)}
}
async function fileToBase64(file:File): Promise<string> {
  return new Promise((res,rej) => {
    const r=new FileReader(); r.onload=()=>res(r.result as string); r.onerror=rej; r.readAsDataURL(file)
  })
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface LinkDraft { fromId:string; mx:number; my:number; over:string|null }
interface BoxSel    { sx:number; sy:number; ex:number; ey:number }
interface CtxItem   { label:string; action:()=>void; danger?:boolean }
interface CtxMenu   { nodeId:string; items:CtxItem[]; x:number; y:number }
interface ResizeDrag { id:string; sx:number; sy:number; ow:number; oh:number }

interface Props { nodes:RoadmapNode[]; onChange:(n:RoadmapNode[])=>void }

// ── Component ──────────────────────────────────────────────────────────────────
export function Roadmap({ nodes, onChange }: Props) {
  const { t } = useT()
  const [pan,  setPan]  = useState({x:60,y:60})
  const [zoom, setZoom] = useState(1)
  const panR  = useRef(pan);  panR.current  = pan
  const zoomR = useRef(zoom); zoomR.current = zoom

  const [sel,         setSel]         = useState<Set<string>>(new Set())
  const selR = useRef(sel); selR.current = sel

  const livePosR  = useRef<Record<string,{x:number;y:number}>>({})
  const [tick,    setTick]    = useState(0)
  const rerender  = useCallback(()=>setTick(t=>t+1),[])

  const [editing, setEditing] = useState<string|null>(null)
  const [editVal, setEditVal] = useState('')
  const inputRef  = useRef<HTMLInputElement>(null)
  const textareaR = useRef<HTMLTextAreaElement>(null)

  const [hovered,   setHovered]   = useState<string|null>(null)
  const [linkMode,  setLinkMode]  = useState(false)
  const draftR      = useRef<LinkDraft|null>(null)
  const [draftTick, setDraftTick] = useState(0)
  const rerenderDraft = useCallback(()=>setDraftTick(t=>t+1),[])

  const boxStartR = useRef<{sx:number;sy:number}|null>(null)
  const [box,       setBox]     = useState<BoxSel|null>(null)
  const [ctxMenu,   setCtxMenu] = useState<CtxMenu|null>(null)
  const [snapGrid,  setSnapGrid]= useState(false)
  const [showMM,    setShowMM]  = useState(true)
  const snapGridR = useRef(snapGrid); snapGridR.current = snapGrid
  const [copied,    setCopied]  = useState<RoadmapNode[]>([])
  const histR    = useRef<RoadmapNode[][]>([[...nodes]])
  const histIdxR = useRef(0)
  const nodesR   = useRef(nodes); nodesR.current = nodes
  const canvasRef = useRef<HTMLDivElement>(null)
  const panDragR  = useRef<{sx:number;sy:number;ox:number;oy:number}|null>(null)
  const nodeDragR = useRef<{ids:string[];sx:number;sy:number;origins:Record<string,{x:number;y:number}>}|null>(null)
  const resizeDragR = useRef<ResizeDrag|null>(null)

  // ── History ──────────────────────────────────────────────────────────────────
  const saveAndChange = useCallback((ns:RoadmapNode[])=>{
    histR.current = histR.current.slice(0, histIdxR.current+1)
    histR.current.push([...ns])
    if (histR.current.length>MAX_HIST) histR.current.shift(); else histIdxR.current++
    onChange(ns)
  },[onChange])

  const undo = useCallback(()=>{
    if (histIdxR.current<=0) return
    histIdxR.current--; onChange(histR.current[histIdxR.current])
    setSel(new Set()); livePosR.current={}; rerender()
  },[onChange,rerender])
  const redo = useCallback(()=>{
    if (histIdxR.current>=histR.current.length-1) return
    histIdxR.current++; onChange(histR.current[histIdxR.current])
    setSel(new Set()); livePosR.current={}; rerender()
  },[onChange,rerender])

  // ── Zoom ─────────────────────────────────────────────────────────────────────
  const applyZoom = useCallback((nz:number,px:number,py:number)=>{
    const z0=zoomR.current, z1=clamp(nz,ZOOM_MIN,ZOOM_MAX)
    const {x,y}=panR.current
    setPan({x:px-(px-x)*(z1/z0), y:py-(py-y)*(z1/z0)}); setZoom(z1)
  },[])
  const zoomIn  = useCallback(()=>{const r=canvasRef.current?.getBoundingClientRect(); applyZoom(zoomR.current*1.2, r?r.width/2:200, r?r.height/2:150)},[applyZoom])
  const zoomOut = useCallback(()=>{const r=canvasRef.current?.getBoundingClientRect(); applyZoom(zoomR.current/1.2, r?r.width/2:200, r?r.height/2:150)},[applyZoom])
  const resetView = useCallback(()=>{setZoom(1); setPan({x:60,y:60})},[])
  const fitView = useCallback(()=>{
    const ns=nodesR.current; if (!ns.length) return
    const r=canvasRef.current?.getBoundingClientRect(); if (!r) return
    const bb=bbox(ns), pad=64
    const z=clamp(Math.min((r.width-pad*2)/bb.w,(r.height-pad*2)/bb.h),ZOOM_MIN,ZOOM_MAX)
    setZoom(z); setPan({x:pad-bb.x*z, y:pad-bb.y*z})
  },[])
  useEffect(()=>{
    const el=canvasRef.current; if (!el) return
    const h=(e:WheelEvent)=>{ e.preventDefault(); const r=el.getBoundingClientRect(); applyZoom(zoomR.current*(e.deltaY<0?1.1:0.9), e.clientX-r.left, e.clientY-r.top) }
    el.addEventListener('wheel',h,{passive:false}); return ()=>el.removeEventListener('wheel',h)
  },[applyZoom])

  const s2w = useCallback((sx:number,sy:number)=>{
    const r=canvasRef.current!.getBoundingClientRect()
    return {x:(sx-r.left-panR.current.x)/zoomR.current, y:(sy-r.top-panR.current.y)/zoomR.current}
  },[])

  const getPos = useCallback((n:RoadmapNode)=>livePosR.current[n.id]??{x:n.x,y:n.y},[tick])

  // ── Add node ─────────────────────────────────────────────────────────────────
  const addNode = useCallback((parentId:string|null, pos?:{x:number;y:number}, type:RoadmapNode['nodeType']='default')=>{
    const ns=nodesR.current
    let p=pos
    if (!p) {
      if (parentId) {
        const par=ns.find(n=>n.id===parentId)!
        const sibs=ns.filter(n=>n.parentId===parentId)
        p={x:par.x+NW_DEFAULT+90, y:sibs.length?Math.max(...sibs.map(s=>s.y))+NH_DEFAULT+14:par.y}
      } else {
        const roots=ns.filter(n=>!n.parentId)
        p=roots.length?{x:roots[0].x, y:Math.max(...roots.map(r=>r.y))+NH_DEFAULT+20}:{x:40,y:40}
      }
    }
    if (snapGridR.current) p={x:snapG(p.x),y:snapG(p.y)}
    const defaults: Partial<RoadmapNode> = {}
    if (type==='text')  { defaults.w=200; defaults.h=100; defaults.notes='' }
    if (type==='image') { defaults.w=200; defaults.h=140 }
    if (type==='group') { defaults.w=300; defaults.h=200; defaults.color='#2a2a2a' }
    const node:RoadmapNode = {id:genId(), title: type==='text'? t.rmNewNote : type==='group'? t.rmNewGroup : type==='image'? t.rmNewImage : t.rmNewStep, status:'todo', notes:'', parentId, nodeType:type, ...defaults, ...p}
    saveAndChange([...ns, node])
    setSel(new Set([node.id]))
    if (type==='default'||type==='group') setTimeout(()=>{setEditing(node.id); setEditVal(node.title); inputRef.current?.select()},30)
    if (type==='text') setTimeout(()=>textareaR.current?.focus(),30)
  },[saveAndChange])

  const deleteSelected = useCallback(()=>{
    const ids=selR.current; if (!ids.size) return
    const dead=new Set(ids)
    let ch=true; while(ch){ch=false; nodesR.current.forEach(n=>{if(n.parentId&&dead.has(n.parentId)&&!dead.has(n.id)){dead.add(n.id);ch=true}})}
    saveAndChange(nodesR.current.filter(n=>!dead.has(n.id))); setSel(new Set())
  },[saveAndChange])

  const cycleStatus = useCallback((id:string,e:React.MouseEvent)=>{
    e.stopPropagation()
    saveAndChange(nodesR.current.map(n=>n.id===id?{...n,status:STATUS_CYCLE[n.status]}:n))
  },[saveAndChange])

  const setNodeColor = useCallback((id:string,color:string|null)=>{
    saveAndChange(nodesR.current.map(n=>n.id===id?{...n,color:color??undefined}:n)); setCtxMenu(null)
  },[saveAndChange])

  const commitEdit = useCallback(()=>{
    if (!editing) return
    const raw=editVal.trim()||'sem título'
    const clMatch=raw.match(/^\[\]\s*(.*)$/)
    if (clMatch) {
      const firstText=clMatch[1].trim()||'item 1'
      saveAndChange(nodesR.current.map(n=>n.id===editing?{...n,title:'checklist',nodeType:'checklist' as const,checkItems:[{id:genCheckId(),text:firstText,checked:false}]}:n))
    } else {
      saveAndChange(nodesR.current.map(n=>n.id===editing?{...n,title:raw}:n))
    }
    setEditing(null)
  },[editing,editVal,saveAndChange])

  const duplicateSelected = useCallback(()=>{
    const ids=selR.current
    const toDup=nodesR.current.filter(n=>ids.has(n.id))
    const idMap:Record<string,string>={}; toDup.forEach(n=>{idMap[n.id]=genId()})
    const duped=toDup.map(n=>({...n,id:idMap[n.id],x:n.x+PASTE_OFFSET,y:n.y+PASTE_OFFSET,parentId:n.parentId&&idMap[n.parentId]?idMap[n.parentId]:null}))
    saveAndChange([...nodesR.current,...duped]); setSel(new Set(duped.map(n=>n.id))); setCtxMenu(null)
  },[saveAndChange])

  const copySelected = useCallback(()=>setCopied(nodesR.current.filter(n=>selR.current.has(n.id))),[])
  const paste = useCallback(()=>{
    if (!copied.length) return
    const idMap:Record<string,string>={}; copied.forEach(n=>{idMap[n.id]=genId()})
    const pasted=copied.map(n=>({...n,id:idMap[n.id],x:n.x+PASTE_OFFSET,y:n.y+PASTE_OFFSET,parentId:n.parentId&&idMap[n.parentId]?idMap[n.parentId]:null}))
    saveAndChange([...nodesR.current,...pasted]); setSel(new Set(pasted.map(n=>n.id)))
  },[copied,saveAndChange])

  const removeEdge = useCallback((childId:string,e:React.MouseEvent)=>{
    e.stopPropagation()
    saveAndChange(nodesR.current.map(n=>n.id===childId?{...n,parentId:null}:n))
  },[saveAndChange])

  // ── Checklist ops ─────────────────────────────────────────────────────────────
  const toggleCheckItem = useCallback((nodeId:string,itemId:string)=>{
    saveAndChange(nodesR.current.map(n=>n.id!==nodeId?n:{...n,checkItems:(n.checkItems??[]).map(ci=>ci.id===itemId?{...ci,checked:!ci.checked}:ci)}))
  },[saveAndChange])
  const addCheckItem = useCallback((nodeId:string)=>{
    const newId=genCheckId()
    saveAndChange(nodesR.current.map(n=>n.id!==nodeId?n:{...n,checkItems:[...(n.checkItems??[]),{id:newId,text:'novo item',checked:false}]}))
    setTimeout(()=>{ const inputs=document.querySelectorAll<HTMLInputElement>(`[data-node="${nodeId}"] .rm-ci-input`); inputs[inputs.length-1]?.focus() },40)
  },[saveAndChange])
  const updateCheckItemText = useCallback((nodeId:string,itemId:string,text:string)=>{
    onChange(nodesR.current.map(n=>n.id!==nodeId?n:{...n,checkItems:(n.checkItems??[]).map(ci=>ci.id===itemId?{...ci,text}:ci)}))
  },[onChange])
  const removeCheckItem = useCallback((nodeId:string,itemId:string)=>{
    saveAndChange(nodesR.current.map(n=>n.id!==nodeId?n:{...n,checkItems:(n.checkItems??[]).filter(ci=>ci.id!==itemId)}))
  },[saveAndChange])
  const convertToDefault = useCallback((nodeId:string)=>{
    saveAndChange(nodesR.current.map(n=>n.id!==nodeId?n:{...n,nodeType:'default' as const,checkItems:[]})); setCtxMenu(null)
  },[saveAndChange])

  // ── Image drop ───────────────────────────────────────────────────────────────
  const handleImageDrop = useCallback(async (e:React.DragEvent)=>{
    e.preventDefault()
    const file=e.dataTransfer.files[0]
    if (!file||!file.type.startsWith('image/')) return
    const data=await fileToBase64(file)
    const w=s2w(e.clientX, e.clientY)
    const p={x:w.x-110, y:w.y-75}
    if (snapGridR.current) { p.x=snapG(p.x); p.y=snapG(p.y) }
    const node:RoadmapNode={id:genId(),title:'imagem',status:'todo',notes:'',parentId:null,nodeType:'image',w:220,h:150,imageData:data,...p}
    saveAndChange([...nodesR.current, node])
    setSel(new Set([node.id]))
  },[s2w,saveAndChange])

  // ── Link mode ─────────────────────────────────────────────────────────────────
  const startLink = useCallback((fromId:string,e:React.MouseEvent)=>{
    e.stopPropagation()
    const w=s2w(e.clientX,e.clientY)
    draftR.current={fromId,mx:w.x,my:w.y,over:null}; rerenderDraft()
  },[s2w,rerenderDraft])
  const finishLink = useCallback((toId:string)=>{
    const d=draftR.current
    if (!d||d.fromId===toId||hasCycle(nodesR.current,d.fromId,toId)){draftR.current=null;rerenderDraft();return}
    saveAndChange(nodesR.current.map(n=>n.id===toId?{...n,parentId:d.fromId}:n))
    draftR.current=null; rerenderDraft()
  },[saveAndChange,rerenderDraft])

  // ── Context menu ──────────────────────────────────────────────────────────────
  const openCtx = useCallback((nodeId:string,e:React.MouseEvent)=>{
    e.preventDefault(); e.stopPropagation()
    const r=canvasRef.current!.getBoundingClientRect()
    const node=nodesR.current.find(n=>n.id===nodeId)
    const items:CtxItem[]=[
      {label:`✎  ${t.rmCtxEdit}`, action:()=>{setEditing(nodeId);setEditVal(nodesR.current.find(n=>n.id===nodeId)?.title??'');setCtxMenu(null);setTimeout(()=>inputRef.current?.select(),30)}},
      {label:`⊕  ${t.rmCtxAddChild}`, action:()=>{setCtxMenu(null);addNode(nodeId)}},
      ...(node?.nodeType==='checklist'
        ?[{label:`↩  ${t.rmCtxToDefault}`, action:()=>convertToDefault(nodeId)}]
        :node?.nodeType==='default'?[{label:`☰  ${t.rmCtxToChecklist}`, action:()=>{saveAndChange(nodesR.current.map(n=>n.id===nodeId?{...n,nodeType:'checklist' as const,checkItems:n.checkItems?.length?n.checkItems:[{id:genCheckId(),text:n.title,checked:false}],title:'checklist'}:n));setCtxMenu(null)}}]
        :[]
      ),
      {label:`⧉  ${t.rmCtxDuplicate}`, action:()=>{setSel(new Set([nodeId]));duplicateSelected()}},
      {label:`✂  ${t.rmCtxDisconnect}`, action:()=>{saveAndChange(nodesR.current.map(n=>n.id===nodeId?{...n,parentId:null}:n));setCtxMenu(null)}},
      {label:`×  ${t.rmCtxDelete}`, action:()=>{setSel(new Set([nodeId]));setCtxMenu(null);setTimeout(deleteSelected,0)}, danger:true},
    ]
    setCtxMenu({nodeId,items,x:e.clientX-r.left,y:e.clientY-r.top})
  },[addNode,duplicateSelected,deleteSelected,saveAndChange,convertToDefault])

  // ── Keyboard ──────────────────────────────────────────────────────────────────
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      const meta=e.metaKey||e.ctrlKey
      // Never intercept keys when focus is inside a text input/textarea
      const active = document.activeElement
      const inTextField = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
      if (editing&&e.key!=='Escape'&&e.key!=='Enter') return
      switch(true){
        case e.key==='Escape': setSel(new Set());setLinkMode(false);draftR.current=null;rerenderDraft();setCtxMenu(null);if(editing)setEditing(null);break
        case (e.key==='Delete'||e.key==='Backspace')&&!inTextField: e.preventDefault();deleteSelected();break
        case meta&&e.key==='z'&&!e.shiftKey: e.preventDefault();undo();break
        case meta&&(e.key==='y'||(e.key==='z'&&e.shiftKey)): e.preventDefault();redo();break
        case meta&&e.key==='c'&&!inTextField: e.preventDefault();copySelected();break
        case meta&&e.key==='v'&&!inTextField: e.preventDefault();paste();break
        case meta&&e.key==='a'&&!inTextField: e.preventDefault();setSel(new Set(nodesR.current.map(n=>n.id)));break
        case meta&&e.key==='d'&&!inTextField: e.preventDefault();duplicateSelected();break
        case meta&&e.key==='f': e.preventDefault();fitView();break
        case e.key==='Enter'&&!!editing: commitEdit();break
      }
    }
    window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h)
  },[editing,deleteSelected,undo,redo,copySelected,paste,duplicateSelected,fitView,commitEdit,rerenderDraft])

  // ── Global mouse ──────────────────────────────────────────────────────────────
  useEffect(()=>{
    const move=(e:MouseEvent)=>{
      if (panDragR.current){
        const {sx,sy,ox,oy}=panDragR.current; setPan({x:ox+e.clientX-sx,y:oy+e.clientY-sy})
      }
      if (nodeDragR.current&&!linkMode){
        const {ids,sx,sy,origins}=nodeDragR.current; const z=zoomR.current
        const dx=(e.clientX-sx)/z, dy=(e.clientY-sy)/z
        const pos:Record<string,{x:number;y:number}>={}
        ids.forEach(id=>{
          let x=origins[id].x+dx, y=origins[id].y+dy
          if(snapGridR.current){x=snapG(x);y=snapG(y)}
          pos[id]={x,y}
        })
        livePosR.current=pos; rerender()
      }
      if (resizeDragR.current){
        const {id,sx,sy,ow,oh}=resizeDragR.current; const z=zoomR.current
        const nw=Math.max(120, ow+(e.clientX-sx)/z)
        const nh=Math.max(60,  oh+(e.clientY-sy)/z)
        onChange(nodesR.current.map(n=>n.id===id?{...n,w:nw,h:nh}:n))
      }
      if (draftR.current){
        const r=canvasRef.current?.getBoundingClientRect()
        if(r) { draftR.current={...draftR.current,mx:(e.clientX-r.left-panR.current.x)/zoomR.current,my:(e.clientY-r.top-panR.current.y)/zoomR.current}; rerenderDraft() }
      }
      if (boxStartR.current){
        const r=canvasRef.current?.getBoundingClientRect()
        if(r) setBox({sx:boxStartR.current.sx,sy:boxStartR.current.sy,ex:e.clientX-r.left,ey:e.clientY-r.top})
      }
    }
    const up=(e:MouseEvent)=>{
      if (panDragR.current){ panDragR.current=null; return }
      if (resizeDragR.current){ resizeDragR.current=null; return }
      if (nodeDragR.current){
        const pos={...livePosR.current}
        saveAndChange(nodesR.current.map(n=>pos[n.id]?{...n,...pos[n.id]}:n))
        livePosR.current={}; rerender(); nodeDragR.current=null; return
      }
      if (draftR.current&&!draftR.current.over){draftR.current=null;rerenderDraft();return}
      if (boxStartR.current){
        const r=canvasRef.current?.getBoundingClientRect()
        const b=box
        if(r&&b){
          const minX=Math.min(b.sx,b.ex),maxX=Math.max(b.sx,b.ex)
          const minY=Math.min(b.sy,b.ey),maxY=Math.max(b.sy,b.ey)
          if(maxX-minX>4||maxY-minY>4){
            const newSel=new Set<string>()
            nodesR.current.forEach(n=>{
              const p=livePosR.current[n.id]??{x:n.x,y:n.y}
              const nx=p.x*zoomR.current+panR.current.x, ny=p.y*zoomR.current+panR.current.y
              const nw=getNodeW(n)*zoomR.current, nh=getNodeH(n)*zoomR.current
              if(nx<maxX&&nx+nw>minX&&ny<maxY&&ny+nh>minY) newSel.add(n.id)
            }); setSel(newSel)
          } else { if(!e.shiftKey) setSel(new Set()) }
        }
        boxStartR.current=null; setBox(null)
      }
    }
    window.addEventListener('mousemove',move); window.addEventListener('mouseup',up)
    return ()=>{window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up)}
  },[nodes,onChange,saveAndChange,rerender,rerenderDraft,box,linkMode])

  // ── Minimap ───────────────────────────────────────────────────────────────────
  const minimap = ()=>{
    if(!showMM||!nodes.length) return null
    const bb=bbox(nodes), pad=10
    const sx=(MM_W-pad*2)/(bb.w||1), sy=(MM_H-pad*2)/(bb.h||1), s=Math.min(sx,sy,1)
    const toMM=(x:number,y:number)=>({x:(x-bb.x)*s+pad,y:(y-bb.y)*s+pad})
    const r=canvasRef.current?.getBoundingClientRect()
    const vw=r?r.width/zoom:800, vh=r?r.height/zoom:500
    const vx=-pan.x/zoom, vy=-pan.y/zoom, vp=toMM(vx,vy)
    return (
      <svg className="rm-minimap" width={MM_W} height={MM_H}
        onClick={e=>{ const rect=(e.target as SVGElement).closest('svg')!.getBoundingClientRect(); const wx=(e.clientX-rect.left-pad)/s+bb.x; const wy=(e.clientY-rect.top-pad)/s+bb.y; const cr=canvasRef.current?.getBoundingClientRect(); if(cr) setPan({x:cr.width/2-wx*zoom, y:cr.height/2-wy*zoom}) }}>
        <rect width={MM_W} height={MM_H} fill="#0e0e0e" rx={6}/>
        {nodes.map(n=>{const p=toMM(n.x,n.y); const c=n.color??STATUS_ST[n.status].dot; return <rect key={n.id} x={p.x} y={p.y} width={getNodeW(n)*s} height={getNodeH(n)*s} rx={2} fill={c} opacity={0.6}/>})}
        <rect x={vp.x} y={vp.y} width={vw*s} height={vh*s} fill="none" stroke="#60a5fa" strokeWidth={1} opacity={0.7} rx={1}/>
      </svg>
    )
  }

  const doneC  = nodes.filter(n=>n.status==='done').length
  const doingC = nodes.filter(n=>n.status==='doing').length
  const pct    = Math.round(zoom*100)
  const draft  = draftR.current
  const wt     = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`

  // Sort: groups first (behind), then others
  const sortedNodes = [...nodes].sort((a,b)=>{
    if (a.nodeType==='group'&&b.nodeType!=='group') return -1
    if (b.nodeType==='group'&&a.nodeType!=='group') return 1
    return 0
  })

  return (
    <div className="rm-wrapper">
      {/* Toolbar */}
      <div className="rm-toolbar">
        {nodes.length>0&&(
          <span className="rm-stat">
            {doneC>0&&<span style={{color:'var(--accent)'}}>{doneC} ✓</span>}
            {doingC>0&&<span style={{color:'var(--amber)'}}>{doingC} ◉</span>}
            <span style={{color:'var(--dim)'}}>/ {nodes.length}</span>
          </span>
        )}
        <button className="rm-btn" onClick={()=>addNode(null,undefined,'default')}>+ {t.rmNewStep}</button>
        <button className="rm-btn" onClick={()=>addNode(null,undefined,'text')}   title={t.rmNewNote}>✎ {t.rmNote}</button>
        <button className="rm-btn" onClick={()=>addNode(null,undefined,'group')}  title={t.rmNewGroup}>⬜ {t.rmNewGroup.toLowerCase()}</button>
        <label className="rm-btn rm-img-label" title={t.rmNewImage}>
          🖼 {t.rmNewImage}
          <input type="file" accept="image/*" style={{display:'none'}} onChange={async e=>{
            const file=e.target.files?.[0]; if(!file) return
            const data=await fileToBase64(file)
            const p={x:Math.max(0,(-pan.x/zoom)+60), y:Math.max(0,(-pan.y/zoom)+60)}
            if (snapGridR.current){p.x=snapG(p.x);p.y=snapG(p.y)}
            const node:RoadmapNode={id:genId(),title:'imagem',status:'todo',notes:'',parentId:null,nodeType:'image',w:220,h:150,imageData:data,...p}
            saveAndChange([...nodesR.current,node]); setSel(new Set([node.id]))
            e.target.value=''
          }}/>
        </label>
        <button className={`rm-btn ${linkMode?'active':''}`} onClick={()=>{setLinkMode(m=>!m);draftR.current=null;rerenderDraft()}} title={t.rmConnectBanner}>
          {linkMode ? t.rmConnecting : t.rmConnect}
        </button>
        <div className="rm-zoom-grp">
          <button className="rm-zoom-btn" onClick={zoomOut} disabled={zoom<=ZOOM_MIN}>−</button>
          <span className="rm-zoom-pct">{pct}%</span>
          <button className="rm-zoom-btn" onClick={zoomIn}  disabled={zoom>=ZOOM_MAX}>+</button>
        </div>
        <button className="rm-icon-btn" onClick={fitView}   title="⌘F">⊡</button>
        <button className="rm-icon-btn" onClick={resetView}>⊹</button>
        <button className={`rm-icon-btn ${snapGrid?'active-opt':''}`} onClick={()=>setSnapGrid(s=>!s)} title="Snap grid">⊞</button>
        <button className={`rm-icon-btn ${showMM?'active-opt':''}`}   onClick={()=>setShowMM(s=>!s)}   title="Minimapa">⊟</button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="rm-canvas"
        style={{cursor:linkMode?(draft?'crosshair':'cell'):panDragR.current?'grabbing':'grab'}}
        onClick={()=>setCtxMenu(null)}
        onDragOver={e=>e.preventDefault()}
        onDrop={handleImageDrop}
        onMouseDown={e=>{
          if (linkMode) return
          setCtxMenu(null)
          const tag=(e.target as HTMLElement).tagName
          const cls=(e.target as HTMLElement).classList
          const isBg=cls.contains('rm-canvas')||cls.contains('rm-world')||cls.contains('rm-svg')||tag==='svg'||tag==='path'||tag==='polygon'||tag==='g'||tag==='circle'||tag==='text'
          if (isBg){
            if (!e.shiftKey) setSel(new Set())
            const r=canvasRef.current!.getBoundingClientRect()
            if (e.shiftKey){ boxStartR.current={sx:e.clientX-r.left,sy:e.clientY-r.top} }
            else { panDragR.current={sx:e.clientX,sy:e.clientY,ox:panR.current.x,oy:panR.current.y} }
            e.preventDefault()
          }
        }}
        onContextMenu={e=>e.preventDefault()}
      >
        {nodes.length===0&&<div className="rm-empty">{t.roadmapEmptyHint}</div>}
        {linkMode&&<div className="rm-connect-banner">{draft ? t.rmConnectDragBanner : t.rmConnectBanner}</div>}

        {snapGrid&&(
          <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
            <defs><pattern id="rm-grid" x={pan.x%(GRID*zoom)} y={pan.y%(GRID*zoom)} width={GRID*zoom} height={GRID*zoom} patternUnits="userSpaceOnUse"><circle cx={0} cy={0} r={0.8} fill="#2a2a2a"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#rm-grid)"/>
          </svg>
        )}

        {box&&<div style={{position:'absolute',left:Math.min(box.sx,box.ex),top:Math.min(box.sy,box.ey),width:Math.abs(box.ex-box.sx),height:Math.abs(box.ey-box.sy),border:'1px solid rgba(96,165,250,0.7)',background:'rgba(96,165,250,0.08)',pointerEvents:'none',borderRadius:2}}/>}

        {/* SVG edges */}
        <svg className="rm-svg" style={{position:'absolute',inset:0,width:'100%',height:'100%',overflow:'visible',pointerEvents:'none'}}>
          <g style={{transform:wt,transformOrigin:'0 0'}}>
            {nodes.map(child=>{
              if (!child.parentId) return null
              const parent=nodes.find(n=>n.id===child.parentId); if (!parent) return null
              const pp=getPos(parent), cp=getPos(child)
              const ph=getNodeH(parent), ch=getNodeH(child)
              const pw=getNodeW(parent), cw=getNodeW(child)
              const {sp,tp,ss,ts}=getBestPorts(pp.x,pp.y,ph,cp.x,cp.y,ch,pw,cw)
              const d=bezierD(sp,tp,ss,ts), pts=arrowPts(tp,ts)
              const accent=child.color??STATUS_ST[child.status].dot
              const midX=(sp.x+tp.x)/2, midY=(sp.y+tp.y)/2
              return (
                <g key={child.id}>
                  <path d={d} fill="none" stroke={accent} strokeWidth={child.status==='todo'?1.5:2} strokeDasharray={child.status==='todo'?'7 5':undefined} opacity={child.status==='todo'?0.45:0.9}/>
                  <polygon points={pts} fill={accent} opacity={child.status==='todo'?0.45:0.9}/>
                  {/* fat hit area */}
                  <path d={d} fill="none" stroke="transparent" strokeWidth={14} style={{pointerEvents:'stroke',cursor:'pointer'}} onClick={e=>removeEdge(child.id,e as unknown as React.MouseEvent)}/>
                  {/* × delete at midpoint */}
                  <g style={{pointerEvents:'all',cursor:'pointer'}} onClick={e=>removeEdge(child.id,e as unknown as React.MouseEvent)}>
                    <circle cx={midX} cy={midY} r={8} fill="#181818" stroke="#2a2a2a" strokeWidth={1.5}/>
                    <text x={midX} y={midY+4} textAnchor="middle" fontSize={11} fill="#666" style={{pointerEvents:'none',userSelect:'none'}}>×</text>
                  </g>
                </g>
              )
            })}
            {/* preview */}
            {draft&&(()=>{
              const src=nodes.find(n=>n.id===draft.fromId); if(!src) return null
              const sp2=getPos(src), ph2=getNodeH(src), pw2=getNodeW(src)
              const isValid=draft.over&&draft.over!==draft.fromId&&!hasCycle(nodes,draft.fromId,draft.over)
              const color=draft.over?(isValid?'#60a5fa':'#f87171'):'#60a5fa'
              const {sp:sp3}=getBestPorts(sp2.x,sp2.y,ph2,draft.mx-NW_DEFAULT/2,draft.my-NH_DEFAULT/2,NH_DEFAULT,pw2,NW_DEFAULT)
              const preD=`M ${sp3.x} ${sp3.y} L ${draft.mx} ${draft.my}`
              return <g><path d={preD} fill="none" stroke={color} strokeWidth={2} strokeDasharray="7 4" opacity={0.85}/><polygon points={`${draft.mx},${draft.my} ${draft.mx-AL},${draft.my-AH} ${draft.mx-AL},${draft.my+AH}`} fill={color} opacity={0.85}/></g>
            })()}
          </g>
        </svg>

        {/* HTML nodes */}
        <div className="rm-world" style={{transform:wt,transformOrigin:'0 0'}}>
          {sortedNodes.map(node=>{
            const pos=getPos(node)
            const s=STATUS_ST[node.status]
            const accent=node.color??s.dot
            const isSel    = sel.has(node.id)
            const isEdit   = editing===node.id
            const isHover  = hovered===node.id
            const isDrag   = !!livePosR.current[node.id]
            const isSrc    = draft?.fromId===node.id
            const isOver   = draft?.over===node.id&&node.id!==draft?.fromId
            const canConn  = isOver&&draft?!hasCycle(nodes,draft.fromId,node.id):false
            const nodeW    = getNodeW(node)
            const nodeH    = getNodeH(node)
            const isGroup  = node.nodeType==='group'
            const isText   = node.nodeType==='text'
            const isImage  = node.nodeType==='image'
            const isCL     = node.nodeType==='checklist'

            const borderColor = isSrc?'#60a5fa':isOver&&canConn?'#60a5fa':isOver&&!canConn?'#f87171':isSel?accent:isGroup?(node.color??'#2a2a2a'):s.border
            const borderW2 = isSel||isSrc||isOver?'2px':'1.5px'
            const isResiz  = isResizable(node)

            return (
              <div
                key={node.id}
                data-node={node.id}
                className={`rm-node ${isGroup?'rm-node-group':''} ${isText?'rm-node-text':''} ${isImage?'rm-node-image':''}`}
                style={{
                  left:pos.x, top:pos.y,
                  width:nodeW,
                  height:isCL?'auto':nodeH,
                  minHeight:isCL?NH_CL_HDR+NH_CL_ADD:undefined,
                  background:isGroup?'rgba(255,255,255,0.02)':isImage?'#111':s.bg,
                  border:`${borderW2} solid ${borderColor}`,
                  boxShadow:isSrc?`0 0 0 3px rgba(96,165,250,0.2)`:isSel?`0 0 0 2px ${accent}28`:isHover&&!isDrag?`0 0 0 2px ${borderColor}33`:undefined,
                  cursor:linkMode?(draft?'crosshair':'grab'):isDrag?'grabbing':isEdit?'text':'grab',
                  opacity:isDrag?0.8:1,
                  zIndex:isGroup?0:isSel||isSrc||isHover||isDrag?20:1,
                  flexDirection:isCL?'column':'row',
                  alignItems:isCL?'stretch':'center',
                  padding:isGroup||isCL||isText||isImage?0:undefined,
                  overflow:isImage?'hidden':'visible',
                }}
                onMouseDown={e=>{
                  if (isEdit) return
                  e.stopPropagation()
                  if (linkMode){startLink(node.id,e);return}
                  if (!sel.has(node.id)){
                    if (e.shiftKey) setSel(prev=>new Set([...prev,node.id]))
                    else setSel(new Set([node.id]))
                  }
                  const ids=sel.has(node.id)?[...selR.current]:[node.id]
                  const origins:Record<string,{x:number;y:number}>={}
                  ids.forEach(id=>{const n=nodesR.current.find(x=>x.id===id);if(n) origins[id]={x:n.x,y:n.y}})
                  nodeDragR.current={ids,sx:e.clientX,sy:e.clientY,origins}
                }}
                onMouseEnter={()=>{setHovered(node.id);if(draftR.current){draftR.current={...draftR.current,over:node.id};rerenderDraft()}}}
                onMouseLeave={()=>{setHovered(null);if(draftR.current){draftR.current={...draftR.current,over:null};rerenderDraft()}}}
                onMouseUp={e=>{if(draft&&draft.fromId!==node.id){e.stopPropagation();finishLink(node.id)}}}
                onDoubleClick={e=>{
                  if (linkMode||isCL||isImage) return
                  e.stopPropagation()
                  setEditing(node.id); setEditVal(node.title)
                  setTimeout(()=>{if(isText) textareaR.current?.focus(); else inputRef.current?.select()},20)
                }}
                onContextMenu={e=>openCtx(node.id,e)}
              >
                {/* Color accent bar */}
                {node.color&&!isGroup&&<div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:node.color,borderRadius:'4px 0 0 4px',zIndex:1}}/>}

                {/* ── GROUP node ── */}
                {isGroup&&(
                  <>
                    <div className="rm-group-header">
                      {isEdit?(
                        <input ref={inputRef} className="rm-node-input rm-group-title-input" value={editVal} onChange={e=>setEditVal(e.target.value)} onBlur={commitEdit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commitEdit()}if(e.key==='Escape')setEditing(null)}} onClick={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()}/>
                      ):(
                        <span className="rm-group-title">{node.title || t.rmGroup}</span>
                      )}
                    </div>
                    {/* Resize handle */}
                    <div className="rm-resize-handle" onMouseDown={e=>{e.stopPropagation();resizeDragR.current={id:node.id,sx:e.clientX,sy:e.clientY,ow:nodeW,oh:nodeH}}}/>
                  </>
                )}

                {/* ── TEXT node ── */}
                {isText&&(
                  <>
                    <textarea
                      ref={isEdit?textareaR:undefined}
                      className="rm-text-area"
                      placeholder={t.rmNotePlaceholder}
                      value={node.notes}
                      onChange={e=>{e.stopPropagation(); onChange(nodesR.current.map(n=>n.id===node.id?{...n,notes:e.target.value}:n))}}
                      onClick={e=>e.stopPropagation()}
                      onMouseDown={e=>e.stopPropagation()}
                      onKeyDown={e=>e.stopPropagation()}
                    />
                    <div className="rm-resize-handle" onMouseDown={e=>{e.stopPropagation();resizeDragR.current={id:node.id,sx:e.clientX,sy:e.clientY,ow:nodeW,oh:nodeH}}}/>
                  </>
                )}

                {/* ── IMAGE node ── */}
                {isImage&&(
                  <>
                    {node.imageData?(
                      <img src={node.imageData} style={{width:'100%',height:'100%',objectFit:'cover',display:'block',borderRadius:4,pointerEvents:'none'}} alt="roadmap"/>
                    ):(
                      <label style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,cursor:'pointer',color:'var(--dim)',fontSize:11,fontFamily:'var(--mono)'}}>
                        <span style={{fontSize:24,opacity:0.3}}>🖼</span>
                        <span>{t.rmClickToChoose}</span>
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={async ev=>{
                          const file=ev.target.files?.[0]; if(!file) return
                          const data=await fileToBase64(file)
                          saveAndChange(nodesR.current.map(n=>n.id===node.id?{...n,imageData:data}:n))
                          ev.target.value=''
                        }}/>
                      </label>
                    )}
                    <div className="rm-resize-handle" onMouseDown={e=>{e.stopPropagation();resizeDragR.current={id:node.id,sx:e.clientX,sy:e.clientY,ow:nodeW,oh:nodeH}}}/>
                  </>
                )}

                {/* ── DEFAULT node ── */}
                {!isGroup&&!isText&&!isImage&&!isCL&&(
                  <>
                    <button className="rm-node-dot" style={{background:accent,flexShrink:0,marginLeft:node.color?10:undefined}} title={s.label} onClick={e=>cycleStatus(node.id,e)} onMouseDown={e=>e.stopPropagation()}/>
                    {isEdit?(
                      <input ref={inputRef} className="rm-node-input" value={editVal} onChange={e=>setEditVal(e.target.value)} onBlur={commitEdit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commitEdit()}if(e.key==='Escape')setEditing(null)}} onClick={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()} placeholder="[] para checklist"/>
                    ):(
                      <span className="rm-node-title" style={{color:node.color?'var(--text)':node.status==='done'?'#a3e635':'#e0e0e0',textDecoration:node.status==='done'?'line-through':'none',textDecorationColor:'#a3e63560'}}>{node.title}</span>
                    )}
                    {!linkMode&&<button className="rm-node-add" title="Filho" onClick={e=>{e.stopPropagation();addNode(node.id)}} onMouseDown={e=>e.stopPropagation()}>+</button>}
                  </>
                )}

                {/* ── CHECKLIST node ── */}
                {isCL&&(
                  <>
                    <div className="rm-cl-header" onMouseDown={e=>e.stopPropagation()}>
                      <span className="rm-cl-icon">☰</span>
                      {isEdit?(<input ref={inputRef} className="rm-node-input rm-cl-title-input" value={editVal} onChange={e=>setEditVal(e.target.value)} onBlur={commitEdit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commitEdit()}if(e.key==='Escape')setEditing(null)}} onClick={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()}/>)
                      :(<span className="rm-cl-title" onDoubleClick={e=>{e.stopPropagation();setEditing(node.id);setEditVal(node.title);setTimeout(()=>inputRef.current?.select(),20)}}>{node.title}</span>)}
                      {(node.checkItems?.length??0)>0&&<span className="rm-cl-count">{node.checkItems?.filter(ci=>ci.checked).length??0}/{node.checkItems?.length??0}</span>}
                    </div>
                    {(node.checkItems?.length??0)>0&&(
                      <div className="rm-cl-progress"><div className="rm-cl-progress-fill" style={{width:`${Math.round(((node.checkItems?.filter(ci=>ci.checked).length??0)/(node.checkItems?.length??1))*100)}%`,background:accent}}/></div>
                    )}
                    <div className="rm-cl-items" onMouseDown={e=>e.stopPropagation()}>
                      {(node.checkItems??[]).map(ci=>(
                        <div key={ci.id} className="rm-ci-row">
                          <button className="rm-ci-box" style={ci.checked?{background:accent,borderColor:accent}:{}} onClick={e=>{e.stopPropagation();toggleCheckItem(node.id,ci.id)}} onMouseDown={e=>e.stopPropagation()}>{ci.checked&&<span className="rm-ci-tick">✓</span>}</button>
                          <input className="rm-ci-input" value={ci.text} style={{textDecoration:ci.checked?'line-through':'none',color:ci.checked?'var(--muted)':'var(--text)'}} onChange={e=>updateCheckItemText(node.id,ci.id,e.target.value)} onClick={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addCheckItem(node.id)}if(e.key==='Backspace'&&ci.text===''){e.preventDefault();removeCheckItem(node.id,ci.id)}}}/>
                          <button className="rm-ci-del" onClick={e=>{e.stopPropagation();removeCheckItem(node.id,ci.id)}} onMouseDown={e=>e.stopPropagation()}>×</button>
                        </div>
                      ))}
                    </div>
                    <button className="rm-cl-add" onClick={e=>{e.stopPropagation();addCheckItem(node.id)}} onMouseDown={e=>e.stopPropagation()}>+ item</button>
                    {!linkMode&&<button className="rm-node-add" title="Filho" onClick={e=>{e.stopPropagation();addNode(node.id)}} onMouseDown={e=>e.stopPropagation()}>+</button>}
                  </>
                )}

                {/* Hover controls */}
                {isHover&&!isEdit&&!linkMode&&(
                  <button className="rm-node-del" onClick={e=>{e.stopPropagation();setSel(new Set([node.id]));deleteSelected()}} onMouseDown={e=>e.stopPropagation()}>×</button>
                )}
                {isHover&&!isEdit&&!linkMode&&!isGroup&&!isText&&!isImage&&!isCL&&(
                  <span className="rm-node-badge" style={{color:accent,borderColor:`${accent}40`}}>{s.label}</span>
                )}
                {linkMode&&isHover&&!draft&&<span className="rm-node-connect-hint">{t.rmDragHint}</span>}
                {isOver&&<span className="rm-node-connect-hint" style={{color:canConn?'#60a5fa':'#f87171'}}>{canConn ? t.rmConnectHere : t.rmInvalid}</span>}
              </div>
            )
          })}
        </div>

        {/* Minimap */}
        <div style={{position:'absolute',bottom:8,right:8,zIndex:30}}>{minimap()}</div>

        {/* Context menu */}
        {ctxMenu&&(
          <div className="rm-ctx-menu" style={{left:ctxMenu.x,top:ctxMenu.y}} onMouseDown={e=>e.stopPropagation()}>
            {ctxMenu.items.map((item,i)=>(<button key={i} className={`rm-ctx-item ${item.danger?'danger':''}`} onClick={item.action}>{item.label}</button>))}
            <div className="rm-ctx-sep"/>
            <div className="rm-ctx-label">Cor do nó</div>
            <div className="rm-ctx-colors">
              {PALETTE.map((c,i)=>(<button key={i} className="rm-ctx-color" title={PALETTE_NAMES[i]} style={{background:c??'#2a2a2a',border:c?`2px solid ${c}`:'2px solid #444'}} onClick={()=>setNodeColor(ctxMenu.nodeId,c)}/>))}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="rm-legend">
        {linkMode?(
          <><span style={{color:'var(--blue)'}}>{t.rmLegendMode}</span><span className="rm-legend-sep">·</span><span>{t.rmLegendDrag} · {t.rmLegendRemove} · {t.rmLegendEsc}</span></>
        ):(
          <><span>{t.rmLegendScroll}</span><span className="rm-legend-sep">·</span><span>{t.rmLegendMove}</span><span className="rm-legend-sep">·</span><span>{t.rmLegendEdit}</span><span className="rm-legend-sep">·</span><span>{t.rmLegendChecklist}</span><span className="rm-legend-sep">·</span><span>{t.rmLegendResize}</span><span className="rm-legend-sep">·</span><span>{t.rmLegendShortcuts}</span><span className="rm-legend-sep">·</span><span>{t.rmLegendMenu}</span></>
        )}
      </div>
    </div>
  )
}
