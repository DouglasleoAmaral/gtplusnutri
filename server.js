require('dotenv').config();
const express=require('express');
const session=require('express-session');
const bcrypt=require('bcryptjs');
const helmet=require('helmet');
const compression=require('compression');
const rateLimit=require('express-rate-limit');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const app=express();
const PORT=Number(process.env.PORT||3000);
const DB_PATH=path.join(__dirname,'data','database.json');
const EMPTY={users:[],nutritionists:[],patients:[],assessments:[],mealPlans:[],foodDiaries:[],appointments:[],auditLogs:[]};
const now=()=>new Date().toISOString();
const uid=(p)=>`${p}_${crypto.randomUUID()}`;
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const email=(v)=>clean(v,180).toLowerCase();
const num=(v,d=null)=>{if(v===''||v===null||v===undefined)return d;const x=Number(String(v).replace(',','.'));return Number.isFinite(x)?x:d};
const validDate=(v)=>v&&!Number.isNaN(new Date(v).getTime());
const addDays=(date,days)=>{const d=new Date(date);d.setUTCDate(d.getUTCDate()+Number(days));return d};

function ensureDb(){
  fs.mkdirSync(path.dirname(DB_PATH),{recursive:true});
  if(!fs.existsSync(DB_PATH))fs.writeFileSync(DB_PATH,JSON.stringify(EMPTY,null,2));
}
function readDb(){ensureDb();try{return {...EMPTY,...JSON.parse(fs.readFileSync(DB_PATH,'utf8'))}}catch(e){console.error(e);return structuredClone(EMPTY)}}
function writeDb(db){const t=`${DB_PATH}.tmp`;fs.writeFileSync(t,JSON.stringify(db,null,2));fs.renameSync(t,DB_PATH)}
function safeUser(u){if(!u)return null;const{passwordHash,...rest}=u;return rest}
function planStatus(n){
  const exp=n?.planExpiresAt?new Date(n.planExpiresAt):null;
  const active=Boolean(n?.planActive&&exp&&exp.getTime()>Date.now());
  const days=exp?Math.max(0,Math.ceil((exp.getTime()-Date.now())/86400000)):0;
  return{active,daysRemaining:days,startsAt:n?.planStartsAt||null,expiresAt:n?.planExpiresAt||null};
}
function ageFrom(b){
  if(!validDate(b))return null;const d=new Date(`${b}T12:00:00Z`),r=new Date();let a=r.getUTCFullYear()-d.getUTCFullYear();
  const m=r.getUTCMonth()-d.getUTCMonth();if(m<0||(m===0&&r.getUTCDate()<d.getUTCDate()))a--;return a;
}
function bmiClass(bmi,age){
  if(Number.isFinite(age)&&age>=60){if(bmi<22)return'Magreza (idoso)';if(bmi<=27)return'Eutrofia (idoso)';return'Excesso de peso (idoso)'}
  if(bmi<16)return'Magreza grau III';if(bmi<17)return'Magreza grau II';if(bmi<18.5)return'Magreza grau I';if(bmi<25)return'Eutrofia';if(bmi<30)return'Pré-obesidade';if(bmi<35)return'Obesidade grau I';if(bmi<40)return'Obesidade grau II';return'Obesidade grau III';
}
function adequacyClass(p){if(p<=70)return'Desnutrição grave';if(p<=80)return'Desnutrição moderada';if(p<=90)return'Desnutrição leve';if(p<=110)return'Eutrofia';if(p<=120)return'Sobrepeso';return'Obesidade'}
function waistClass(sex,w){if(!Number.isFinite(w))return'Não informado';if(sex==='F'){if(w>=88)return'Risco muito elevado';if(w>=80)return'Risco elevado'}else if(sex==='M'){if(w>=102)return'Risco muito elevado';if(w>=94)return'Risco elevado'}return'Sem risco elevado por este critério'}
function energyCalc({sex,age,weight,height,activity,bmi,adjusted}){
  if(![age,weight,height].every(Number.isFinite))return{};
  const s=sex==='M'?'M':'F';
  if(bmi>=25){
    const factors=s==='M'?{sedentary:1,light:1.12,moderate:1.29,intense:1.59}:{sedentary:1,light:1.16,moderate:1.27,intense:1.44};
    const fa=factors[activity]||factors.sedentary,w=adjusted;
    if(s==='M')return{tmb:293-3.8*age+456.4*height+10.12*w,get:1086-10.1*age+fa*(13.7*w+416*height),factor:fa,formula:'DRI 2002 — sobrepeso/obesidade'};
    return{tmb:247-2.47*age+401.5*height+8.6*w,get:448-7.95*age+fa*(11.4*w+619*height),factor:fa,formula:'DRI 2002 — sobrepeso/obesidade'};
  }
  let tmb,factors;
  if(age<30){tmb=s==='M'?15.3*weight+679:14.7*weight+496}
  else if(age<=60){tmb=s==='M'?11.6*weight+879:8.7*weight+829}
  else{tmb=s==='M'?13.5*weight+487:10.5*weight+596}
  if(age>60)factors=s==='M'?{sedentary:1.2,light:1.4,moderate:1.6,intense:1.9}:{sedentary:1.2,light:1.4,moderate:1.6,intense:1.8};
  else factors=s==='M'?{sedentary:1.2,light:1.55,moderate:1.8,intense:2.1}:{sedentary:1.2,light:1.55,moderate:1.65,intense:1.8};
  const fa=factors[activity]||factors.sedentary;return{tmb,get:tmb*fa,factor:fa,formula:'FAO/OMS 1985 — adulto/idoso'};
}
function calculate(input){
  const weight=num(input.weight),height=num(input.height),usual=num(input.usualWeight),waist=num(input.waist),sex=clean(input.sex,1).toUpperCase(),age=num(input.age,ageFrom(input.birthDate));
  const activity=['sedentary','light','moderate','intense'].includes(input.activityLevel)?input.activityLevel:'sedentary';
  if(!(weight>0&&height>0))throw new Error('Peso e estatura válidos são obrigatórios.');
  const bmi=weight/(height*height),idealBmi=sex==='M'?22:20.8,ideal=idealBmi*height*height,adequacy=weight/ideal*100;
  const adjusted=bmi>=30?ideal+(weight-ideal)*.25:adequacy<90?weight+(ideal-weight)*.25:weight;
  const loss=usual>0?(usual-weight)/usual*100:null,e=energyCalc({sex,age,weight,height,activity,bmi,adjusted});
  return{weight,height,age,bmi:+bmi.toFixed(2),bmiClassification:bmiClass(bmi,age),idealWeight:+ideal.toFixed(2),idealBmi,adequacyPercent:+adequacy.toFixed(2),adequacyClassification:adequacyClass(adequacy),adjustedWeight:+adjusted.toFixed(2),weightLossPercent:Number.isFinite(loss)?+loss.toFixed(2):null,waist,waistRisk:waistClass(sex,waist),tmb:Number.isFinite(e.tmb)?Math.round(e.tmb):null,get:Number.isFinite(e.get)?Math.round(e.get):null,activityFactor:e.factor||null,energyFormula:e.formula||null,sourceNotes:['Cálculos baseados no Manual RealClin 2026.','Resultados exigem validação da nutricionista.']};
}
function log(db,req,action,type,entityId,details={}){db.auditLogs.push({id:uid('log'),userId:req.session?.userId||null,action,type,entityId,details,createdAt:now()});if(db.auditLogs.length>5000)db.auditLogs=db.auditLogs.slice(-5000)}

async function seedAdmin(){const db=readDb();if(!db.users.some(u=>u.role==='admin')){db.users.push({id:uid('usr'),role:'admin',name:process.env.ADMIN_NAME||'Administrador',email:email(process.env.ADMIN_EMAIL||'admin@nutriplataforma.com'),passwordHash:await bcrypt.hash(process.env.ADMIN_PASSWORD||'TroqueEstaSenha123!',12),active:true,createdAt:now(),updatedAt:now()});writeDb(db)}}
ensureDb();seedAdmin().catch(console.error);

app.set('trust proxy',1);app.use(helmet({contentSecurityPolicy:false}));app.use(compression());app.use(express.json({limit:'1mb'}));app.use(express.urlencoded({extended:false}));
app.use(session({name:'nutri.sid',secret:process.env.SESSION_SECRET||'troque-em-producao',resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:false,maxAge:43200000}}));
const loginLimiter=rateLimit({windowMs:900000,limit:10,message:{error:'Muitas tentativas. Aguarde alguns minutos.'}});
function auth(req,res,next){const db=readDb(),user=db.users.find(u=>u.id===req.session.userId&&u.active!==false);if(!user)return res.status(401).json({error:'Sessão inválida ou expirada.'});req.db=db;req.user=user;next()}
const role=(...roles)=>(req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({error:'Acesso não permitido.'});
function licensed(req,res,next){const n=req.db.nutritionists.find(x=>x.id===req.user.nutritionistId),p=planStatus(n);if(!p.active)return res.status(403).json({error:'Licença inativa ou vencida.',code:'PLAN_INACTIVE',plan:p});req.nutritionist=n;req.plan=p;next()}

app.get('/api/health',(req,res)=>res.json({ok:true,time:now()}));
app.post('/api/auth/login',loginLimiter,async(req,res)=>{
  const db=readDb(),u=db.users.find(x=>x.email===email(req.body.email)&&x.active!==false);
  if(!u||!await bcrypt.compare(String(req.body.password||''),u.passwordHash))return res.status(401).json({error:'E-mail ou senha inválidos.'});
  if(u.role==='nutritionist'){const n=db.nutritionists.find(x=>x.id===u.nutritionistId);if(!planStatus(n).active)return res.status(403).json({error:'Plano inativo ou vencido. Fale com o administrador.',code:'PLAN_INACTIVE'})}
  if(u.role==='patient'){const p=db.patients.find(x=>x.userId===u.id&&x.active!==false),n=p&&db.nutritionists.find(x=>x.id===p.nutritionistId);if(!p||!planStatus(n).active)return res.status(403).json({error:'Acesso inativo. Fale com sua nutricionista.'})}
  req.session.userId=u.id;log(db,req,'LOGIN','user',u.id);writeDb(db);res.json({user:safeUser(u)});
});
app.post('/api/auth/logout',auth,(req,res)=>{const db=req.db;log(db,req,'LOGOUT','user',req.user.id);writeDb(db);req.session.destroy(()=>res.json({ok:true}))});
app.get('/api/auth/me',auth,(req,res)=>{const db=req.db,out={user:safeUser(req.user)};if(req.user.role==='nutritionist'){const n=db.nutritionists.find(x=>x.id===req.user.nutritionistId);out.nutritionist=n;out.plan=planStatus(n)}if(req.user.role==='patient'){const p=db.patients.find(x=>x.userId===req.user.id),n=p&&db.nutritionists.find(x=>x.id===p.nutritionistId);out.patient=p;out.nutritionist=n?{name:n.name,clinicName:n.clinicName,crn:n.crn,phone:n.phone,specialty:n.specialty}:null;out.plan=planStatus(n)}res.json(out)});

// ADMIN
app.get('/api/admin/dashboard',auth,role('admin'),(req,res)=>{
  const db=req.db;
  const list=db.nutritionists.map(n=>({...n,plan:planStatus(n),patientsCount:db.patients.filter(p=>p.nutritionistId===n.id&&p.active!==false).length}));
  res.json({totals:{nutritionists:list.length,activeLicenses:list.filter(n=>n.plan.active).length,expiredLicenses:list.filter(n=>!n.plan.active).length,patients:db.patients.filter(p=>p.active!==false).length},nutritionists:list});
});

app.post('/api/admin/nutritionists',auth,role('admin'),async(req,res)=>{
  const db=req.db,name=clean(req.body.name,120),mail=email(req.body.email),password=String(req.body.password||''),days=Math.floor(num(req.body.days,0));
  if(!name||!mail||password.length<8)return res.status(400).json({error:'Nome, e-mail e senha com pelo menos 8 caracteres são obrigatórios.'});
  if(db.users.some(u=>u.email===mail))return res.status(409).json({error:'Já existe usuário com esse e-mail.'});
  const userId=uid('usr'),nutritionistId=uid('nut'),start=days>0?new Date():null,expires=start?addDays(start,days):null;
  db.users.push({id:userId,nutritionistId,role:'nutritionist',name,email:mail,passwordHash:await bcrypt.hash(password,12),active:true,createdAt:now(),updatedAt:now()});
  const n={id:nutritionistId,userId,name,email:mail,crn:clean(req.body.crn,40),phone:clean(req.body.phone,30),clinicName:clean(req.body.clinicName,120),specialty:clean(req.body.specialty,200),planActive:days>0,planStartsAt:start?.toISOString()||null,planExpiresAt:expires?.toISOString()||null,createdAt:now(),updatedAt:now()};
  db.nutritionists.push(n);log(db,req,'CREATE_NUTRITIONIST','nutritionist',n.id,{days});writeDb(db);
  res.status(201).json({nutritionist:{...n,plan:planStatus(n)}});
});

app.patch('/api/admin/nutritionists/:id/license',auth,role('admin'),(req,res)=>{
  const db=req.db,n=db.nutritionists.find(x=>x.id===req.params.id);
  if(!n)return res.status(404).json({error:'Nutricionista não encontrada.'});
  const action=clean(req.body.action,20),days=Math.floor(num(req.body.days,0));
  if(action==='deactivate')n.planActive=false;
  else if(action==='activate'||action==='set'){
    if(days<1||days>3650)return res.status(400).json({error:'Informe de 1 a 3650 dias.'});
    const current=n.planExpiresAt?new Date(n.planExpiresAt):null;
    const base=action==='set'?new Date():(current&&current.getTime()>Date.now()?current:new Date());
    if(action==='set'||!n.planStartsAt)n.planStartsAt=new Date().toISOString();
    n.planExpiresAt=addDays(base,days).toISOString();n.planActive=true;
  }else return res.status(400).json({error:'Ação inválida.'});
  n.updatedAt=now();log(db,req,'UPDATE_LICENSE','nutritionist',n.id,{action,days});writeDb(db);
  res.json({nutritionist:{...n,plan:planStatus(n)}});
});

app.patch('/api/admin/nutritionists/:id',auth,role('admin'),async(req,res)=>{
  const db=req.db,n=db.nutritionists.find(x=>x.id===req.params.id);
  if(!n)return res.status(404).json({error:'Nutricionista não encontrada.'});
  const u=db.users.find(x=>x.id===n.userId);
  if(req.body.name){n.name=clean(req.body.name,120);if(u)u.name=n.name}
  for(const f of ['crn','phone','clinicName','specialty'])if(req.body[f]!==undefined)n[f]=clean(req.body[f],200);
  if(req.body.active!==undefined&&u)u.active=Boolean(req.body.active);
  if(req.body.password&&String(req.body.password).length>=8&&u)u.passwordHash=await bcrypt.hash(String(req.body.password),12);
  n.updatedAt=now();if(u)u.updatedAt=now();log(db,req,'UPDATE_NUTRITIONIST','nutritionist',n.id);writeDb(db);
  res.json({nutritionist:{...n,plan:planStatus(n)}});
});

// NUTRICIONISTA
app.get('/api/nutritionist/dashboard',auth,role('nutritionist'),licensed,(req,res)=>{
  const db=req.db,idn=req.nutritionist.id;
  const patients=db.patients.filter(p=>p.nutritionistId===idn&&p.active!==false);
  const today=new Date().toISOString().slice(0,10);
  res.json({
    plan:req.plan,
    totals:{
      patients:patients.length,
      assessments:db.assessments.filter(a=>a.nutritionistId===idn).length,
      mealPlans:db.mealPlans.filter(p=>p.nutritionistId===idn).length,
      appointmentsToday:db.appointments.filter(a=>a.nutritionistId===idn&&a.date===today).length
    },
    recentPatients:[...patients].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5),
    upcomingAppointments:db.appointments.filter(a=>a.nutritionistId===idn&&a.date>=today).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0,8)
  });
});

app.get('/api/nutritionist/patients',auth,role('nutritionist'),licensed,(req,res)=>{
  const db=req.db;
  const patients=db.patients.filter(p=>p.nutritionistId===req.nutritionist.id).map(p=>{
    const u=db.users.find(x=>x.id===p.userId);
    const last=db.assessments.filter(a=>a.patientId===p.id).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
    return{...p,loginEmail:u?.email||p.email,lastAssessment:last};
  }).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  res.json({patients});
});

app.post('/api/nutritionist/patients',auth,role('nutritionist'),licensed,async(req,res)=>{
  const db=req.db,name=clean(req.body.name,120),mail=email(req.body.email),password=String(req.body.password||''),birthDate=clean(req.body.birthDate,10);
  if(!name||!mail||password.length<8)return res.status(400).json({error:'Nome, e-mail e senha com pelo menos 8 caracteres são obrigatórios.'});
  if(birthDate&&!validDate(birthDate))return res.status(400).json({error:'Data inválida.'});
  if(db.users.some(u=>u.email===mail))return res.status(409).json({error:'E-mail já cadastrado.'});
  const userId=uid('usr'),patientId=uid('pat');
  db.users.push({id:userId,nutritionistId:req.nutritionist.id,patientId,role:'patient',name,email:mail,passwordHash:await bcrypt.hash(password,12),active:true,createdAt:now(),updatedAt:now()});
  const p={
    id:patientId,userId,nutritionistId:req.nutritionist.id,name,email:mail,
    cpf:clean(req.body.cpf,20),phone:clean(req.body.phone,30),birthDate,
    sex:['F','M','O'].includes(req.body.sex)?req.body.sex:'O',
    goal:clean(req.body.goal,500),allergies:clean(req.body.allergies,800),
    conditions:clean(req.body.conditions,800),medications:clean(req.body.medications,800),
    notes:clean(req.body.notes,2000),active:true,createdAt:now(),updatedAt:now()
  };
  db.patients.push(p);log(db,req,'CREATE_PATIENT','patient',p.id);writeDb(db);
  res.status(201).json({patient:p});
});

app.get('/api/nutritionist/patients/:id',auth,role('nutritionist'),licensed,(req,res)=>{
  const db=req.db,p=db.patients.find(x=>x.id===req.params.id&&x.nutritionistId===req.nutritionist.id);
  if(!p)return res.status(404).json({error:'Paciente não encontrado.'});
  const u=db.users.find(x=>x.id===p.userId);
  res.json({
    patient:{...p,loginEmail:u?.email||p.email},
    assessments:db.assessments.filter(a=>a.patientId===p.id).sort((a,b)=>b.date.localeCompare(a.date)),
    mealPlans:db.mealPlans.filter(x=>x.patientId===p.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),
    foodDiaries:db.foodDiaries.filter(x=>x.patientId===p.id).sort((a,b)=>b.date.localeCompare(a.date)),
    appointments:db.appointments.filter(x=>x.patientId===p.id).sort((a,b)=>`${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
  });
});

app.patch('/api/nutritionist/patients/:id',auth,role('nutritionist'),licensed,async(req,res)=>{
  const db=req.db,p=db.patients.find(x=>x.id===req.params.id&&x.nutritionistId===req.nutritionist.id);
  if(!p)return res.status(404).json({error:'Paciente não encontrado.'});
  const u=db.users.find(x=>x.id===p.userId);
  for(const f of ['name','cpf','phone','birthDate','goal','allergies','conditions','medications','notes']){
    if(req.body[f]!==undefined)p[f]=clean(req.body[f],f==='notes'?2000:800);
  }
  if(req.body.sex!==undefined&&['F','M','O'].includes(req.body.sex))p.sex=req.body.sex;
  if(req.body.active!==undefined){p.active=Boolean(req.body.active);if(u)u.active=p.active}
  if(req.body.password&&String(req.body.password).length>=8&&u)u.passwordHash=await bcrypt.hash(String(req.body.password),12);
  if(u)u.name=p.name;p.updatedAt=now();log(db,req,'UPDATE_PATIENT','patient',p.id);writeDb(db);
  res.json({patient:p});
});

app.post('/api/nutritionist/calculations/preview',auth,role('nutritionist'),licensed,(req,res)=>{
  try{res.json({result:calculate(req.body)})}catch(e){res.status(400).json({error:e.message})}
});

app.post('/api/nutritionist/patients/:id/assessments',auth,role('nutritionist'),licensed,(req,res)=>{
  const db=req.db,p=db.patients.find(x=>x.id===req.params.id&&x.nutritionistId===req.nutritionist.id);
  if(!p)return res.status(404).json({error:'Paciente não encontrado.'});
  try{
    const result=calculate({...req.body,sex:p.sex,birthDate:p.birthDate});
    const assessment={
      id:uid('ass'),patientId:p.id,nutritionistId:req.nutritionist.id,
      date:clean(req.body.date,10)||new Date().toISOString().slice(0,10),
      weight:result.weight,height:result.height,usualWeight:num(req.body.usualWeight),
      waist:num(req.body.waist),arm:num(req.body.arm),calf:num(req.body.calf),
      bodyFat:num(req.body.bodyFat),activityLevel:req.body.activityLevel||'sedentary',
      bloodPressure:clean(req.body.bloodPressure,30),notes:clean(req.body.notes,2000),
      result,createdAt:now(),updatedAt:now()
    };
    db.assessments.push(assessment);log(db,req,'CREATE_ASSESSMENT','assessment',assessment.id,{patientId:p.id});writeDb(db);
    res.status(201).json({assessment});
  }catch(e){res.status(400).json({error:e.message})}
});

app.post('/api/nutritionist/patients/:id/meal-plans',auth,role('nutritionist'),licensed,(req,res)=>{
  const db=req.db,p=db.patients.find(x=>x.id===req.params.id&&x.nutritionistId===req.nutritionist.id);
  if(!p)return res.status(404).json({error:'Paciente não encontrado.'});
  const meals=Array.isArray(req.body.meals)?req.body.meals.slice(0,20).map(m=>({id:uid('meal'),name:clean(m.name,80),time:clean(m.time,10),items:clean(m.items,2000),substitutions:clean(m.substitutions,2000)})).filter(m=>m.name||m.items):[];
  if(!meals.length)return res.status(400).json({error:'Adicione pelo menos uma refeição.'});
  const plan={
    id:uid('plan'),patientId:p.id,nutritionistId:req.nutritionist.id,
    title:clean(req.body.title,160)||'Plano alimentar',objective:clean(req.body.objective,500),
    totalCalories:num(req.body.totalCalories),proteinGrams:num(req.body.proteinGrams),
    carbohydrateGrams:num(req.body.carbohydrateGrams),fatGrams:num(req.body.fatGrams),
    hydrationMl:num(req.body.hydrationMl),guidance:clean(req.body.guidance,4000),
    meals,released:req.body.released!==false,createdAt:now(),updatedAt:now()
  };
  db.mealPlans.push(plan);log(db,req,'CREATE_MEAL_PLAN','mealPlan',plan.id,{patientId:p.id});writeDb(db);
  res.status(201).json({mealPlan:plan});
});

app.post('/api/nutritionist/appointments',auth,role('nutritionist'),licensed,(req,res)=>{
  const db=req.db,p=db.patients.find(x=>x.id===req.body.patientId&&x.nutritionistId===req.nutritionist.id);
  if(!p)return res.status(404).json({error:'Paciente não encontrado.'});
  if(!validDate(req.body.date))return res.status(400).json({error:'Data inválida.'});
  const appointment={id:uid('apt'),nutritionistId:req.nutritionist.id,patientId:p.id,patientName:p.name,date:clean(req.body.date,10),time:clean(req.body.time,5),type:clean(req.body.type,80)||'Consulta',notes:clean(req.body.notes,1000),status:'scheduled',createdAt:now()};
  db.appointments.push(appointment);log(db,req,'CREATE_APPOINTMENT','appointment',appointment.id);writeDb(db);
  res.status(201).json({appointment});
});

// PACIENTE
app.get('/api/patient/dashboard',auth,role('patient'),(req,res)=>{
  const db=req.db,p=db.patients.find(x=>x.userId===req.user.id&&x.active!==false);
  if(!p)return res.status(404).json({error:'Perfil não encontrado.'});
  const n=db.nutritionists.find(x=>x.id===p.nutritionistId);
  if(!planStatus(n).active)return res.status(403).json({error:'Acesso indisponível. Fale com sua nutricionista.'});
  const assessments=db.assessments.filter(x=>x.patientId===p.id).sort((a,b)=>b.date.localeCompare(a.date));
  const plans=db.mealPlans.filter(x=>x.patientId===p.id&&x.released).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const appointments=db.appointments.filter(x=>x.patientId===p.id).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const diaries=db.foodDiaries.filter(x=>x.patientId===p.id).sort((a,b)=>b.date.localeCompare(a.date));
  res.json({patient:p,nutritionist:n?{name:n.name,clinicName:n.clinicName,crn:n.crn,phone:n.phone,specialty:n.specialty}:null,latestAssessment:assessments[0]||null,assessments,currentMealPlan:plans[0]||null,mealPlans:plans,appointments,foodDiaries:diaries});
});

app.post('/api/patient/food-diary',auth,role('patient'),(req,res)=>{
  const db=req.db,p=db.patients.find(x=>x.userId===req.user.id&&x.active!==false);
  if(!p)return res.status(404).json({error:'Perfil não encontrado.'});
  const n=db.nutritionists.find(x=>x.id===p.nutritionistId);if(!planStatus(n).active)return res.status(403).json({error:'Acesso indisponível.'});
  const diary={id:uid('diary'),patientId:p.id,nutritionistId:p.nutritionistId,date:clean(req.body.date,10)||new Date().toISOString().slice(0,10),meal:clean(req.body.meal,80),time:clean(req.body.time,5),description:clean(req.body.description,2000),hunger:Math.min(10,Math.max(0,Math.floor(num(req.body.hunger,0)))),waterMl:Math.max(0,num(req.body.waterMl,0)),notes:clean(req.body.notes,1000),createdAt:now()};
  if(!diary.meal||!diary.description)return res.status(400).json({error:'Refeição e descrição são obrigatórias.'});
  db.foodDiaries.push(diary);log(db,req,'CREATE_FOOD_DIARY','foodDiary',diary.id);writeDb(db);res.status(201).json({diary});
});

app.use('/api',(req,res)=>res.status(404).json({error:'Rota não encontrada.'}));
app.use(express.static(path.join(__dirname,'public')));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'Erro interno. Tente novamente.'})});
app.listen(PORT,'0.0.0.0',()=>console.log(`Nutri SaaS disponível na porta ${PORT}`));
