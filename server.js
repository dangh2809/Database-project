const express= require('express')
const app = express()
const path=require('path')
const bodyParser = require('body-parser')
require('dotenv').config()
const {check,validationResult}=require('express-validator')
var mysql=require('mysql');
 var connection=mysql.createConnection({
   host:process.env.HOST_NAME,
   user:process.env.DB_USERNAME,
   password:process.env.USER_PASSWORD,
   database:process.env.DB_NAME
 });

connection.connect(function(error){
   if(!!error){
     console.log(error);
   }else{
     console.log('Connected!:)');
   }
 });  
module.exports = connection; 
app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'))
app.use(express.static(__dirname));

app.get('/test',(req,res)=>{
  res.send("HOLAAA")
})
app.use(
    express.urlencoded({
      extended: true
    })
  )
app.use(express.json())

app.post('/login',(req,res)=>{
  res.render('loginPage');
}) 
app.post('/loginProcess',[
  check('passwordInput','Password is Empty').exists(),
  check('emailInput','Email is invalid').isEmail().normalizeEmail()
], function(req, res){ // Specifies which URL to listen for
    // req.body -- contains form data

    const error= validationResult(req)
    const alert = error.array()

    if(!error.isEmpty())
    {
      res.render('loginPage',{
        alert
      })
    }
    else{

    var object = req.body;
    var sql = "Select firstname,lastname,userID from USERS where email='"+object.emailInput+"'AND userPassword='"+object.passwordInput+"'";
    connection.query(sql, function (err, result) {
      if (err) throw err;
        console.log(result); 
      if(result[0])
      {
     res.redirect("/?user="+ result[0]["firstname"] +" "+ result[0]["lastname"]+" "+result[0]["userID"]);
      }
      else
      {
        const dalert = [ {"msg":"Incorrect Email or Password. Please try again."}]

        res.render('loginPage',
      {alert: dalert})
      }
    });
  }
});
app.post('/SignUp',(req,res)=>{
    res.render('signUpPage');
}) 
app.get('/',(req,res)=>{
  if(req.query.user)
  {
  var userSQL ="Select * from users where userID="+req.query.user;
  connection.query(publicSql, function (err, result) {
    var uniSQL ="Select uniID from studentinuniversity where studentID="+req.query.user;
  
  
  
  });
  }

  //var trendSQL = "Select * from CREATOR_EVENT ORDER BY ratingCount DESC LIMIT 10;";
  //Public
 var publicSql = "SELECT e.eventId,e.eventName,e.eventdate,e.eventTime,e.eventDescrip FROM uniEvents e where eventType=1";
 //Private 
 var privatecSql = "SELECT e.eventId,e.eventName,e.eventdate,e.eventTime,e.eventDescrip FROM uniEvents e where eventType=2";
 
 var returnObject ={}
  var arrayOFEvents =[]

  connection.query(publicSql, function (err, result) {
    var results= JSON.parse(JSON.stringify(result))
    var dat ,time,eventTime=''
    results.forEach(element => {
        //NOTE SAVE DATE AS UTC
         dat=element.eventdate;
        dat =new Date(dat).toLocaleString('en', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        console.log(element.eventdate)
         time= element.eventTime;
    arrayOFEvents.push({ "eventTitle": element.eventName,"eventDecrip":element.eventDescrip,"eventTime":time,"eventDate":dat })
});
returnObject["Public"] = arrayOFEvents;
console.log(returnObject);
arrayOFEvents =[]
res.render('mainPlatform',{ lists:returnObject ,userName:req.query.user});

});

//   connection.query(sql, function (err, result) {
//     var results= JSON.parse(JSON.stringify(result))
//     var curCat = result[0].categoryName
//     var dat ,time,eventTime=''
//     results.forEach(element => {

//       if(curCat == element.categoryName)
//       {
//         //NOTE SAVE DATE AS UTC
//          dat=element.eventdate;
//         dat =new Date(dat).toLocaleString('en', {
//           month: 'long',
//           day: 'numeric',
//           year: 'numeric',
//         });
//          time=new Date(dat).toLocaleTimeString();
//         eventTime= time
//         arrayOFEvents.push({ "eventTitle": element.eventName, "eventImage":element.eventImageLink,"eventLink":element.eventLink,"eventDecrip":element.eventDescrip,"price":element.ticketPrice,"eventTime":eventTime,"eventDate":dat,"rate":element.ratingCount  })
//         console.log( arrayOFEvents)
//       }
//       else
//       {
//         returnObject[curCat] = arrayOFEvents;
//         arrayOFEvents=[];
//          dat=element.eventdate;
//         dat =new Date(dat).toLocaleString('en', {
//           month: 'long',
//           day: 'numeric',
//           year: 'numeric',
//         });
//          time=new Date(dat).toLocaleTimeString();
//         eventTime= time
// arrayOFEvents.push({ "eventTitle": element.eventName, "eventImage":element.eventImageLink,"eventLink":element.eventLink,"eventDecrip":element.eventDescrip,"price":element.ticketPrice,"eventTime":eventTime,"eventDate":dat,"rate":element.ratingCount  })
//         curCat=element.categoryName;
//       }
    
//     });

//     returnObject[curCat] = arrayOFEvents;
console.log(returnObject);

  //});


}) 

app.post('/signUpProcess',[
  check('passwordInput','Pasword must be 8+ characters long').exists().isLength({min:8}),
  check('emailInput','Email is invalid').isEmail().normalizeEmail(),
  check('firstNmeInput','First Name cannot be empty').exists().isLength({min:1}),
  check('lastNmeInput','Last Name cannot be empty').exists().isLength({min:1})
], function(req, res){ // Specifies which URL to listen for
    // req.body -- contains form data

    const error= validationResult(req)
    if(!error.isEmpty())
    {
      const alert = error.array()
      res.render('signUpPage',{
        alert
      })
    }
    else{

    
    var object = req.body;
    var sql = "insert into users(firstname,lastname,email,userPassword,userType) Values ('"+object.firstNmeInput+"','"+object.lastNmeInput+"','"+object.emailInput+"','"+object.passwordInput+"',3)";
    connection.query(sql, function (err, result) {
      if (err) throw err;
      res.redirect("/?user="+object.firstNmeInput +" "+ object.lastNmeInput);

    });
    console.log(JSON.stringify(req.body)+" ");
  }
});

function getVideos (){
  var sql = "SELECT e.eventId,c.categoryName,c.categoryID,e.eventName,e.eventLink,e.eventImageLink,e.eventdate,eventDescrip,ticketPrice,ratingCount FROM CREATOR_EVENT e INNER JOIN VIDEO_CAT c on e.categoryID=c.categoryID GROUP BY e.categoryID;";
  var returnObject ={}
  var arrayOFEvents =[]
  connection.query(sql, function (err, result) {
    var results= JSON.parse(JSON.stringify(result))
    var curCat = result[0].categoryName

    results.forEach(element => {


      if(curCat == element.categoryName)
      {
arrayOFEvents.push({ "eventTitle": element.eventName, "eventImage":element.eventImageLink  })
console.log( arrayOFEvents)
      }
      else
      {
        returnObject[curCat] = arrayOFEvents;
        arrayOFEvents=[];
        arrayOFEvents.push({ "eventTitle": element.eventName, "eventImage":element.eventImageLink  })
        curCat=element.categoryName;
      }
    
    });

    returnObject[curCat] = arrayOFEvents;

  });

  return returnObject;
}

const port = process.env.PORT||3000
app.listen(port,()=>{
    console.log("Server Running...")
});

