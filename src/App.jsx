import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ShoppingCart, Wallet, Plus, Trash2, CalendarDays,
  Store, ChartColumn, House, X
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip
} from "recharts";

const supabase = createClient(
  "https://qdvjlaukhfenmpjmrler.supabase.co",
  "sb_publishable_s8xpgmb7UhWwOhPRyO6mEQ_H6sQga3d"
);

const COLORS = ["#647f68", "#e5a65c", "#7294b8", "#bb829b", "#9b91c5"];
const STORES = ["Lidl", "Maxima", "Norfa", "Rimi", "Kita"];
const CATEGORIES = ["Maistas", "Gėrimai", "Namai", "Higiena", "Kita"];

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    product: "", store: "Lidl", category: "Maistas",
    amount: "", quantity: "1", purchased_at: new Date().toISOString().slice(0, 10)
  });

  const total = purchases.reduce((s, p) => s + Number(p.amount), 0);
  const month = new Date().toISOString().slice(0, 7);
  const monthly = purchases
    .filter(p => p.purchased_at?.startsWith(month))
    .reduce((s, p) => s + Number(p.amount), 0);

  const categoryData = CATEGORIES.map(name => ({
    name,
    value: purchases.filter(p => p.category === name)
      .reduce((s, p) => s + Number(p.amount), 0)
  })).filter(x => x.value > 0);

  async function loadPurchases(fid) {
    const { data, error } = await supabase
      .from("purchases").select("*")
      .eq("family_id", fid)
      .order("purchased_at", { ascending: false });
    if (error) setError(error.message);
    else setPurchases(data || []);
  }

  async function login(register = false) {
    setLoading(true);
    setError("");
    const result = register
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    if (register && !result.data.session) {
      setError("Patvirtink el. paštą ir tada prisijunk.");
      setLoading(false);
      return;
    }

    const currentUser = result.data.user;
    setUser(currentUser);
    await findFamily(currentUser.id);
    setLoading(false);
  }

  async function findFamily(uid) {
    const { data, error } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", uid)
      .limit(1);

    if (error) {
      setError(error.message);
      return;
    }

    if (data?.length) {
      setFamilyId(data[0].family_id);
      await loadPurchases(data[0].family_id);
    } else {
      setError("Šiai paskyrai šeima dar nesukurta. Sukurk ją žemiau.");
    }
  }

  async function createFamily() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("families")
      .insert({ name: "Mūsų šeima", created_by: user.id })
      .select().single();

    if (error) {
      setError(error.message);
    } else {
      const { error: memberError } = await supabase
        .from("family_members")
        .insert({ family_id: data.id, user_id: user.id, role: "admin" });

      if (memberError) setError(memberError.message);
      else {
        setFamilyId(data.id);
        await loadPurchases(data.id);
      }
    }
    setLoading(false);
  }

  async function addPurchase(e) {
    e.preventDefault();
    const { data, error } = await supabase.from("purchases").insert({
      ...form,
      amount: Number(form.amount),
      quantity: Number(form.quantity),
      family_id: familyId,
      created_by: user.id
    }).select().single();

    if (error) setError(error.message);
    else {
      setPurchases(prev => [data, ...prev]);
      setShowForm(false);
      setForm({ ...form, product: "", amount: "", quantity: "1" });
    }
  }

  async function deletePurchase(id) {
    const { error } = await supabase.from("purchases").delete().eq("id", id);
    if (error) setError(error.message);
    else setPurchases(prev => prev.filter(p => p.id !== id));
  }

  React.useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user);
        await findFamily(data.session.user.id);
      }
    });
  }, []);

  const css = `
    * { box-sizing:border-box }
    body { margin:0; background:#f5f6f2; font-family:Inter,system-ui,sans-serif; color:#26352c }
    button,input,select { font:inherit }
    .app { max-width:1050px; margin:auto; padding:25px 22px 90px }
    .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:30px }
    .brand { display:flex; align-items:center; gap:12px }
    .logo { background:#345b43; color:white; padding:12px; border-radius:15px }
    .muted { color:#879187; font-size:13px }
    h1 { font-size:23px; margin:0 }
    h2 { font-size:17px; margin:0 0 16px }
    .button { background:#345b43; color:white; border:0; padding:12px 17px; border-radius:12px; cursor:pointer; display:flex; gap:8px; align-items:center }
    .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:15px; margin-bottom:22px }
    .card { background:white; border:1px solid #e9ece6; border-radius:19px; padding:20px }
    .amount { font-size:29px; font-weight:750; margin-top:12px; letter-spacing:-1px }
    .content { display:grid; grid-template-columns:1fr 1fr; gap:18px }
    .storeRow,.purchaseRow { display:flex; justify-content:space-between; align-items:center; padding:13px 0; border-bottom:1px solid #eef0ec }
    .storeIcon { background:#eff3ed; border-radius:10px; padding:9px; margin-right:10px }
    .left { display:flex; align-items:center }
    .history { margin-top:20px }
    .delete { background:none; border:0; color:#a0aaa0; cursor:pointer }
    .modal { position:fixed; inset:0; background:#0007; display:grid; place-items:center; padding:18px; z-index:10 }
    .dialog { background:white; border-radius:20px; padding:25px; width:100%; max-width:440px }
    .field { width:100%; padding:12px; border:1px solid #dce2d9; border-radius:10px; margin:7px 0 15px }
    label { font-size:13px; color:#66736a }
    .full { width:100%; justify-content:center }
    .auth { max-width:390px; margin:12vh auto; background:white; padding:28px; border-radius:20px }
    .error { color:#b34b4b; font-size:13px; margin:12px 0 }
    @media(max-width:650px) {
      .app { padding:18px 14px 80px }
      .grid { grid-template-columns:1fr 1fr }
      .grid .card:last-child { grid-column:span 2 }
      .content { grid-template-columns:1fr }
      .amount { font-size:25px }
      .header { align-items:flex-start }
    }
  `;

  if (!user) return <>
    <style>{css}</style>
    <div className="auth">
      <div className="brand"><div className="logo"><ShoppingCart /></div><div><h1>Mūsų išlaidos</h1><span className="muted">Šeimos pirkinių apskaita</span></div></div>
      <h2 style={{marginTop:30}}>Prisijungimas</h2>
      <label>El. paštas</label>
      <input className="field" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
      <label>Slaptažodis</label>
      <input className="field" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button className="button full" onClick={()=>login(false)} disabled={loading}>Prisijungti</button>
      <button className="button full" style={{marginTop:10,background:"#eaf0e9",color:"#345b43"}} onClick={()=>login(true)} disabled={loading}>Sukurti paskyrą</button>
      {error && <p className="error">{error}</p>}
    </div>
  </>;

  if (!familyId) return <>
    <style>{css}</style>
    <div className="auth">
      <h1>Sveiki atvykę!</h1>
      <p>Sukurk savo šeimos pirkinių erdvę.</p>
      <button className="button full" onClick={createFamily} disabled={loading}>Sukurti šeimą</button>
      {error && <p className="error">{error}</p>}
    </div>
  </>;

  return <>
    <style>{css}</style>
    <main className="app">
      <header className="header">
        <div className="brand"><div className="logo"><ShoppingCart /></div><div><h1>Mūsų išlaidos</h1><span className="muted">Šeimos pirkinių apskaita</span></div></div>
        <button className="button" onClick={()=>setShowForm(true)}><Plus size={18}/> Pridėti</button>
      </header>

      <div className="grid">
        <div className="card"><div className="muted">Šio mėnesio išlaidos</div><div className="amount">{monthly.toFixed(2)} €</div><div className="muted">Per {new Date().toLocaleDateString("lt-LT",{month:"long"})}</div></div>
        <div className="card"><div className="muted">Visos išlaidos</div><div className="amount">{total.toFixed(2)} €</div><div className="muted">Visų įrašų suma</div></div>
        <div className="card"><div className="muted">Pirkinių skaičius</div><div className="amount">{purchases.length}</div><div className="muted">Įrašyta pirkinių</div></div>
      </div>

      <div className="content">
        <section className="card">
          <h2><Store size={18} style={{verticalAlign:"middle"}}/> Išlaidos pagal parduotuvę</h2>
          {STORES.map(s=>{
            const sum=purchases.filter(p=>p.store===s).reduce((a,p)=>a+Number(p.amount),0);
            return <div className="storeRow" key={s}><div className="left"><span className="storeIcon"><Store size={17}/></span>{s}</div><strong>{sum.toFixed(2)} €</strong></div>
          })}
        </section>
        <section className="card">
          <h2><ChartColumn size={18} style={{verticalAlign:"middle"}}/> Išlaidos pagal kategoriją</h2>
          {categoryData.length ? <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={85} label>{categoryData.map((x,i)=><Cell key={x.name} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={v=>`${Number(v).toFixed(2)} €`}/></PieChart></ResponsiveContainer> : <p className="muted">Kol kas nėra pirkinių duomenų.</p>}
        </section>
      </div>

      <section className="card history">
        <h2><CalendarDays size={18} style={{verticalAlign:"middle"}}/> Pirkinių istorija</h2>
        {purchases.length ? purchases.map(p=><div className="purchaseRow" key={p.id}><div><strong>{p.product}</strong><div className="muted">{p.store} · {p.category} · {p.purchased_at}</div></div><div style={{display:"flex",alignItems:"center",gap:12}}><strong>{Number(p.amount).toFixed(2)} €</strong><button className="delete" onClick={()=>deletePurchase(p.id)}><Trash2 size={17}/></button></div></div>) : <p className="muted">Pirkinių dar nėra. Pridėk pirmąjį!</p>}
      </section>
    </main>

    {showForm && <div className="modal"><form className="dialog" onSubmit={addPurchase}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h2>Naujas pirkinys</h2><button type="button" className="delete" onClick={()=>setShowForm(false)}><X/></button></div>
      <label>Produkto pavadinimas</label><input className="field" required value={form.product} onChange={e=>setForm({...form,product:e.target.value})}/>
      <label>Kaina (€)</label><input className="field" type="number" step="0.01" min="0.01" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/>
      <label>Parduotuvė</label><select className="field" value={form.store} onChange={e=>setForm({...form,store:e.target.value})}>{STORES.map(s=><option key={s}>{s}</option>)}</select>
      <label>Kategorija</label><select className="field" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.map(s=><option key={s}>{s}</option>)}</select>
      <label>Data</label><input className="field" type="date" required value={form.purchased_at} onChange={e=>setForm({...form,purchased_at:e.target.value})}/>
      <button className="button full" type="submit">Išsaugoti pirkinį</button>
    </form></div>}
  </>;
}
