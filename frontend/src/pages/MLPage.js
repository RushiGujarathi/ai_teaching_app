import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:8000/api/ml';

// ── colour tokens matching the existing app palette ──────────────────────────
const C = {
  purple : '#667eea',
  purple2: '#5a67d8',
  green  : '#48bb78',
  yellow : '#ecc94b',
  red    : '#fc8181',
  gray0  : '#f0f4f8',
  gray1  : '#edf2f7',
  gray2  : '#e2e8f0',
  gray3  : '#a0aec0',
  gray4  : '#718096',
  gray5  : '#4a5568',
  gray6  : '#2d3748',
  gray7  : '#1a202c',
  white  : '#ffffff',
};

// ── tiny http helpers ─────────────────────────────────────────────────────────
const get  = url => fetch(url).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); });
const post = (url, body) => fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); });

// ── reusable tiny components ──────────────────────────────────────────────────
const Badge = ({ children, color = C.purple }) => (
  <span style={{ background: color + '22', color, padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>
    {children}
  </span>
);

const StatBox = ({ label, value, sub, color = C.purple }) => (
  <div style={{ background: C.white, borderRadius:14, padding:'18px 20px', boxShadow:'0 2px 10px rgba(0,0,0,.06)', flex:1, minWidth:130 }}>
    <div style={{ fontSize:28, fontWeight:800, color }}>{value}</div>
    <div style={{ fontSize:13, fontWeight:600, color:C.gray5, marginTop:2 }}>{label}</div>
    {sub && <div style={{ fontSize:11, color:C.gray3, marginTop:2 }}>{sub}</div>}
  </div>
);

// ── horizontal bar used in feature importance ─────────────────────────────────
const Bar = ({ label, value, max, color = C.purple }) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:3 }}>
        <span style={{ color:C.gray5, fontWeight:500 }}>{label}</span>
        <span style={{ color:C.gray4 }}>{(value * 100).toFixed(2)}%</span>
      </div>
      <div style={{ background:C.gray2, borderRadius:8, height:10, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(90deg,${color},${color}88)`, borderRadius:8, transition:'width .6s ease' }} />
      </div>
    </div>
  );
};

// ── score ring (SVG) ──────────────────────────────────────────────────────────
const ScoreRing = ({ score }) => {
  const r = 54, cx = 66, cy = 66, stroke = 10;
  const circ = 2 * Math.PI * r;
  const dash  = circ * (score / 100);
  const color = score >= 80 ? C.green : score >= 60 ? C.yellow : C.red;
  return (
    <svg width={132} height={132} viewBox="0 0 132 132">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.gray2} strokeWidth={stroke}/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition:'stroke-dasharray 1s ease' }}
      />
      <text x={cx} y={cy - 6}  textAnchor="middle" fontSize={22} fontWeight={800} fill={color}>{score}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={11} fill={C.gray3}>/ 100</text>
    </svg>
  );
};

// ── section card wrapper ──────────────────────────────────────────────────────
const Section = ({ title, icon, children, style = {} }) => (
  <div style={{ background:C.white, borderRadius:16, padding:24, boxShadow:'0 2px 12px rgba(0,0,0,.06)', marginBottom:24, ...style }}>
    {title && (
      <h3 style={{ fontSize:16, fontWeight:700, color:C.gray6, marginBottom:18, display:'flex', alignItems:'center', gap:8 }}>
        <span>{icon}</span>{title}
      </h3>
    )}
    {children}
  </div>
);

// ── MODEL COMPARISON TABLE ────────────────────────────────────────────────────
const ModelTable = ({ models }) => {
  if (!models?.length) return <p style={{color:C.gray3,fontSize:14}}>Loading evaluation…</p>;
  const best = models.reduce((a,b) => a.R2 > b.R2 ? a : b);
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
        <thead>
          <tr style={{ borderBottom:`2px solid ${C.gray2}` }}>
            {['Model','MAE','RMSE','R²','CV R²'].map(h => (
              <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:C.gray4, fontWeight:600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {models.map(m => (
            <tr key={m.model} style={{ borderBottom:`1px solid ${C.gray1}`, background: m.model === best.model ? C.purple + '08' : 'transparent' }}>
              <td style={{ padding:'10px 12px', fontWeight:700, color:C.gray7 }}>
                {m.model === best.model && '🏆 '}{m.model}
              </td>
              <td style={{ padding:'10px 12px', color:C.gray5 }}>{m.MAE}</td>
              <td style={{ padding:'10px 12px', color:C.gray5 }}>{m.RMSE}</td>
              <td style={{ padding:'10px 12px' }}>
                <Badge color={m.R2 >= 0.75 ? C.green : C.yellow}>{(m.R2 * 100).toFixed(1)}%</Badge>
              </td>
              <td style={{ padding:'10px 12px', color:C.gray4 }}>{m.CV_R2_mean} ± {m.CV_R2_std}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── PREDICT FORM ──────────────────────────────────────────────────────────────
const DEFAULTS = {
  study_hours_per_day: 5,
  attendance_pct: 75,
  prev_score: 65,
  sleep_hours: 7,
  tutoring_sessions: 3,
  parental_support: 1,
  internet_access: 1,
  gender: 'male',
  school_type: 'public',
  extracurricular: 0,
};

const SLIDERS = [
  { key:'study_hours_per_day', label:'Study Hours / Day', min:0.5, max:10,  step:0.5, unit:'h' },
  { key:'attendance_pct',      label:'Attendance',        min:40,  max:100, step:1,   unit:'%' },
  { key:'prev_score',          label:'Previous Score',    min:0,   max:100, step:1,   unit:'/100' },
  { key:'sleep_hours',         label:'Sleep Hours',       min:4,   max:10,  step:0.5, unit:'h' },
  { key:'tutoring_sessions',   label:'Tutoring Sessions', min:0,   max:10,  step:1,   unit:'/mo' },
];

const PredictForm = ({ onResult }) => {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true); setErr('');
    try {
      const result = await post(`${API_BASE}/predict`, form);
      onResult(result);
    } catch (e) {
      setErr('❌ Could not connect to backend. Make sure FastAPI is running on :8000');
    } finally {
      setLoading(false);
    }
  };

  const Slider = ({ cfg }) => (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <label style={{ fontSize:13, fontWeight:600, color:C.gray5 }}>{cfg.label}</label>
        <span style={{ fontSize:13, fontWeight:700, color:C.purple }}>{form[cfg.key]}{cfg.unit}</span>
      </div>
      <input type="range" min={cfg.min} max={cfg.max} step={cfg.step}
        value={form[cfg.key]}
        onChange={e => set(cfg.key, parseFloat(e.target.value))}
        style={{ width:'100%', accentColor:C.purple }}
      />
    </div>
  );

  return (
    <div>
      {SLIDERS.map(s => <Slider key={s.key} cfg={s} />)}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:4, marginBottom:16 }}>
        {/* Toggles */}
        {[
          { k:'parental_support', opts:[{v:0,l:'None'},{v:1,l:'Some'},{v:2,l:'Strong'}], label:'Parental Support' },
          { k:'gender',           opts:[{v:'male',l:'Male'},{v:'female',l:'Female'}],     label:'Gender' },
          { k:'school_type',      opts:[{v:'public',l:'Public'},{v:'private',l:'Private'}], label:'School' },
          { k:'internet_access',  opts:[{v:0,l:'No'},{v:1,l:'Yes'}],                      label:'Internet' },
          { k:'extracurricular',  opts:[{v:0,l:'No'},{v:1,l:'Yes'}],                      label:'Extra-curr.' },
        ].map(({ k, opts, label }) => (
          <div key={k}>
            <p style={{ fontSize:12, fontWeight:600, color:C.gray4, marginBottom:5 }}>{label}</p>
            <div style={{ display:'flex', gap:4 }}>
              {opts.map(o => (
                <button key={o.v} onClick={() => set(k, o.v)}
                  style={{
                    flex:1, padding:'6px 0', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600,
                    background: form[k] === o.v ? C.purple : C.gray1,
                    color      : form[k] === o.v ? C.white  : C.gray5,
                    transition :'all .15s',
                  }}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {err && <p style={{ color:C.red, fontSize:13, marginBottom:10 }}>{err}</p>}
      <button onClick={handleSubmit} disabled={loading}
        style={{ width:'100%', padding:'13px 0', background:loading?C.gray3:C.purple, color:C.white, border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer', transition:'all .2s' }}>
        {loading ? '⏳ Predicting…' : '🔮 Predict Final Score'}
      </button>
    </div>
  );
};

// ── PREDICTION RESULT ─────────────────────────────────────────────────────────
const PredictResult = ({ result }) => {
  if (!result) return (
    <div style={{ textAlign:'center', padding:'50px 20px', color:C.gray3 }}>
      <div style={{ fontSize:56, marginBottom:12 }}>🎯</div>
      <p style={{ fontSize:15 }}>Fill in the form and click Predict</p>
    </div>
  );

  const score = result.predicted_score;
  const color = score >= 80 ? C.green : score >= 60 ? C.yellow : C.red;
  const msg   = score >= 80 ? 'Excellent performance predicted! 🎉'
              : score >= 60 ? 'Good performance. Keep it up! 👍'
              :               'Needs improvement. Let\'s work on it! 📖';

  return (
    <div style={{ textAlign:'center' }}>
      <ScoreRing score={Math.round(score)} />
      <div style={{ marginTop:8 }}>
        <Badge color={color}>{result.grade}</Badge>
        <Badge color={color} style={{marginLeft:6}}>{result.performance}</Badge>
      </div>
      <p style={{ color:C.gray5, fontSize:14, marginTop:12, fontStyle:'italic' }}>{msg}</p>

      <div style={{ background:C.gray0, borderRadius:12, padding:14, marginTop:16, textAlign:'left' }}>
        <p style={{ fontSize:12, fontWeight:700, color:C.gray4, marginBottom:8 }}>INPUT SUMMARY</p>
        {[
          ['Study Hours', result.input_summary.study_hours_per_day + 'h/day'],
          ['Attendance',  result.input_summary.attendance_pct + '%'],
          ['Prev Score',  result.input_summary.prev_score + '/100'],
          ['Sleep',       result.input_summary.sleep_hours + 'h'],
          ['Tutoring',    result.input_summary.tutoring_sessions + '/mo'],
          ['Internet',    result.input_summary.internet_access ? 'Yes' : 'No'],
          ['School',      result.input_summary.school_type],
        ].map(([k, v]) => (
          <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'3px 0', borderBottom:`1px solid ${C.gray2}` }}>
            <span style={{ color:C.gray4 }}>{k}</span>
            <span style={{ fontWeight:600, color:C.gray6 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── DATASET SAMPLE TABLE ──────────────────────────────────────────────────────
const DatasetTable = ({ rows }) => {
  if (!rows?.length) return null;
  const SHOW_COLS = ['study_hours_per_day','attendance_pct','prev_score','sleep_hours','tutoring_sessions','gender','school_type','final_score'];
  const cols = SHOW_COLS.filter(c => rows[0][c] !== undefined);
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr style={{ background:C.gray0 }}>
            <th style={{ padding:'8px 10px', color:C.gray4, fontWeight:600, textAlign:'left' }}>#</th>
            {cols.map(c => (
              <th key={c} style={{ padding:'8px 10px', color:C.gray4, fontWeight:600, textAlign:'left', whiteSpace:'nowrap' }}>
                {c.replace(/_/g,' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0,15).map((row, i) => (
            <tr key={i} style={{ borderBottom:`1px solid ${C.gray1}` }}>
              <td style={{ padding:'7px 10px', color:C.gray3 }}>{i+1}</td>
              {cols.map(c => (
                <td key={c} style={{ padding:'7px 10px', color:c === 'final_score' ? C.purple : C.gray6, fontWeight: c==='final_score'?700:400 }}>
                  {typeof row[c] === 'number' ? row[c] : row[c]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function MLPage() {
  const [tab,        setTab]        = useState('overview');   // overview | predict | data | features
  const [evaluation, setEvaluation] = useState(null);
  const [importance, setImportance] = useState([]);
  const [sample,     setSample]     = useState([]);
  const [status,     setStatus]     = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [training,   setTraining]   = useState(false);
  const [trainMsg,   setTrainMsg]   = useState('');

  // load on mount
  useEffect(() => {
    get(`${API_BASE}/status`).then(setStatus).catch(() => {});
    get(`${API_BASE}/evaluation`).then(d => setEvaluation(d)).catch(() => {});
    get(`${API_BASE}/feature-importance`).then(d => setImportance(d.importances || [])).catch(() => {});
    get(`${API_BASE}/dataset/sample?n=15`).then(d => setSample(d.sample || [])).catch(() => {});
  }, []);

  const handleRetrain = async () => {
    setTraining(true); setTrainMsg('');
    try {
      await post(`${API_BASE}/train`, {});
      setTrainMsg('✅ Model retrained successfully!');
      get(`${API_BASE}/evaluation`).then(setEvaluation);
      get(`${API_BASE}/feature-importance`).then(d => setImportance(d.importances||[]));
    } catch {
      setTrainMsg('❌ Training failed. Check backend logs.');
    } finally {
      setTraining(false);
    }
  };

  // Best model from evaluation
  const bestModel = evaluation?.models?.reduce((a,b) => a.R2 > b.R2 ? a : b, {});
  const maxImp    = importance[0]?.importance ?? 1;

  const TAB_STYLE = active => ({
    padding:'9px 18px', border:'none', borderRadius:10, cursor:'pointer', fontSize:14, fontWeight:600,
    background: active ? C.purple : C.gray1,
    color      : active ? C.white  : C.gray5,
    transition :'all .2s',
  });

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:26, fontWeight:800, color:C.gray7, marginBottom:4 }}>🤖 ML Performance Predictor</h2>
        <p  style={{ color:C.gray4 }}>Trained on 600 student records · Random Forest · Ridge Regression · Gradient Boosting</p>
      </div>

      {/* ── Status banner ───────────────────────────────────────────────────── */}
      {status && (
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:20 }}>
          <StatBox label="Model Status"    value={status.model_ready   ? '✅ Ready' : '❌ Missing'} color={status.model_ready?C.green:C.red}/>
          <StatBox label="Dataset"         value={status.dataset_ready ? '✅ Loaded' : '⚠ Missing'} color={status.dataset_ready?C.green:C.yellow}/>
          {bestModel?.model && <StatBox label="Best Model" value={bestModel.model.split(' ')[0]} sub={`R² = ${(bestModel.R2*100).toFixed(1)}%`} color={C.purple}/>}
          {bestModel?.RMSE  && <StatBox label="RMSE"       value={bestModel.RMSE} sub="score points" color={C.yellow}/>}
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {[['overview','📊 Overview'],['predict','🔮 Predict'],['data','🗂 Dataset'],['features','🔬 Features']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={TAB_STYLE(tab===t)}>{l}</button>
        ))}
        <button onClick={handleRetrain} disabled={training}
          style={{ ...TAB_STYLE(false), marginLeft:'auto', background:training?C.gray2:C.gray7, color:C.white }}>
          {training ? '⏳ Training…' : '🔄 Retrain Model'}
        </button>
      </div>
      {trainMsg && <p style={{ color: trainMsg.startsWith('✅') ? C.green : C.red, fontSize:14, marginBottom:16 }}>{trainMsg}</p>}

      {/* ── TAB: OVERVIEW ───────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <>
          <Section title="Model Comparison" icon="📈">
            <ModelTable models={evaluation?.models} />
          </Section>

          <Section title="ML Pipeline" icon="🔬">
            <div style={{ display:'flex', gap:0, flexWrap:'wrap' }}>
              {[
                { step:'1', title:'Data Generation', desc:'600 synthetic students with realistic correlations', icon:'🗃', color:'#667eea' },
                { step:'2', title:'Data Cleaning',   desc:'Remove duplicates, cap outliers, impute missing via median/mode', icon:'🧹', color:'#48bb78' },
                { step:'3', title:'Feature Eng.',    desc:'study_efficiency, performance_tier, OHE for categoricals', icon:'⚙️', color:'#ecc94b' },
                { step:'4', title:'Scaling',         desc:'StandardScaler on numeric features (saved for inference)', icon:'📏', color:'#fc8181' },
                { step:'5', title:'Training',        desc:'Ridge Regression + Random Forest + Gradient Boosting', icon:'🤖', color:'#805ad5' },
                { step:'6', title:'Evaluation',      desc:'MAE, RMSE, R², 5-fold cross-validation', icon:'✅', color:'#38b2ac' },
              ].map((s, i, arr) => (
                <React.Fragment key={s.step}>
                  <div style={{ flex:1, minWidth:120, padding:14, background:s.color+'11', borderRadius:12, textAlign:'center' }}>
                    <div style={{ fontSize:26 }}>{s.icon}</div>
                    <div style={{ fontSize:11, fontWeight:800, color:s.color, marginTop:6, marginBottom:4 }}>STEP {s.step}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.gray6, marginBottom:4 }}>{s.title}</div>
                    <div style={{ fontSize:11, color:C.gray4, lineHeight:1.5 }}>{s.desc}</div>
                  </div>
                  {i < arr.length-1 && <div style={{ alignSelf:'center', fontSize:18, color:C.gray3, padding:'0 4px' }}>→</div>}
                </React.Fragment>
              ))}
            </div>
          </Section>

          <Section title="Key Concepts Used" icon="📚">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
              {[
                ['Supervised Learning',   'Labelled dataset with final_score as target'],
                ['Regression',           'Predicts continuous numeric output (score)'],
                ['Train/Test Split',     '80/20 split to evaluate generalisation'],
                ['Cross Validation',     '5-fold CV prevents overfitting evaluation'],
                ['Feature Engineering',  'study_efficiency = hours × attendance/100'],
                ['One-Hot Encoding',     'Converts gender, school_type to binary cols'],
                ['StandardScaler',       'Z-score normalises numeric features'],
                ['Feature Importance',   'Random Forest measures each feature\'s contribution'],
                ['Hyperparameters',      'n_estimators, max_depth, min_samples_leaf'],
                ['Ensemble Learning',    'Random Forest averages many decision trees'],
                ['Gradient Boosting',    'Sequential trees correct previous errors'],
                ['IQR Winsorisation',    'Caps extreme outliers using quartile fencing'],
              ].map(([title, desc]) => (
                <div key={title} style={{ background:C.gray0, borderRadius:10, padding:12 }}>
                  <p style={{ fontWeight:700, fontSize:13, color:C.purple, marginBottom:4 }}>{title}</p>
                  <p style={{ fontSize:12, color:C.gray5, lineHeight:1.5 }}>{desc}</p>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── TAB: PREDICT ────────────────────────────────────────────────────── */}
      {tab === 'predict' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          <Section title="Student Profile" icon="✏️">
            <PredictForm onResult={setPrediction} />
          </Section>
          <Section title="Prediction Result" icon="🎯">
            <PredictResult result={prediction} />
          </Section>
        </div>
      )}

      {/* ── TAB: DATASET ────────────────────────────────────────────────────── */}
      {tab === 'data' && (
        <>
          <Section title="Raw Dataset Sample (first 15 rows)" icon="🗂">
            {sample.length ? <DatasetTable rows={sample} /> : (
              <p style={{ color:C.gray3, fontSize:14 }}>⚠ Could not load dataset. Ensure backend is running.</p>
            )}
          </Section>
          <Section title="Cleaning Steps Applied" icon="🧹">
            {[
              ['Duplicate Removal', 'Exact duplicates (≈3% injected) dropped using pandas drop_duplicates().'],
              ['Outlier Capping',   'IQR fence: values beyond Q1−1.5×IQR or Q3+1.5×IQR are clipped (Winsorisation).'],
              ['Missing Imputation','Numeric columns → median; Categorical → mode. ~5% NaN was injected deliberately.'],
              ['One-Hot Encoding',  'gender (male/female) and school_type (public/private) encoded as binary columns.'],
              ['Feature Engineering','study_efficiency = study_hours × attendance/100; performance_tier from prev_score buckets.'],
              ['StandardScaling',   'All continuous features zero-centred, unit-variance. Fitted scaler saved as scaler.pkl.'],
            ].map(([title, detail], i) => (
              <div key={i} style={{ display:'flex', gap:14, padding:'12px 0', borderBottom:`1px solid ${C.gray1}` }}>
                <span style={{ width:26, height:26, background:C.purple+'22', color:C.purple, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0, marginTop:1 }}>{i+1}</span>
                <div>
                  <p style={{ fontWeight:700, fontSize:14, color:C.gray6, marginBottom:3 }}>{title}</p>
                  <p style={{ fontSize:13, color:C.gray4, lineHeight:1.6 }}>{detail}</p>
                </div>
              </div>
            ))}
          </Section>
        </>
      )}

      {/* ── TAB: FEATURE IMPORTANCE ─────────────────────────────────────────── */}
      {tab === 'features' && (
        <Section title="Random Forest Feature Importances" icon="🔬">
          {importance.length ? (
            <>
              <p style={{ fontSize:13, color:C.gray4, marginBottom:18, lineHeight:1.6 }}>
                Feature importance measures how much each input reduces prediction error (impurity) across all trees.
                Higher = more predictive. Values sum to 1.
              </p>
              {importance.map(({ feature, importance: imp }) => (
                <Bar key={feature} label={feature.replace(/_/g,' ')} value={imp} max={maxImp} color={C.purple} />
              ))}
            </>
          ) : (
            <p style={{ color:C.gray3, fontSize:14 }}>⚠ Could not load importances. Ensure backend is running.</p>
          )}
        </Section>
      )}
    </div>
  );
}
