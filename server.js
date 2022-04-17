const express= require('express')
const app = express()
const path=require('path')
const bodyParser = require('body-parser')
require('dotenv').config()
const {check,validationResult}=require('express-validator')
var mysql=require('mysql');
const { system } = require('nodemon/lib/config')
const { resetWatchers } = require('nodemon/lib/monitor/watch')
const { emitWarning } = require('process')
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
      var results= JSON.parse(JSON.stringify(result))

      if (err) throw err;
        console.log(results+"HELLOOOOO"); 
      if(results)
      {
     res.redirect("/?user="+results[0].userID);
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
app.get('/event',(req,res)=>{
  var eventSQL="Select * from unievents where eventID="+req.query.event;
  console.log(eventSQL)
  var returnObject={}
  connection.query(eventSQL, function (err, result) {
    var results= JSON.parse(JSON.stringify(result))
    var dat ,time,eventTime=''
    var arrayOFEvents=[]
    console.log("pmsada")
    console.log(results);
    let locationSQL =`select * from location where locationID=${results[0].eventLocation}`;
    results.forEach(element => {
        //NOTE SAVE DATE AS UTC
         dat=element.eventDate;
        dat =new Date(dat).toLocaleString('en', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });

        console.log(element.eventdate)
         time= element.eventTime;
    arrayOFEvents.push({ "eventTitle": element.eventName,"eventDecrip":element.eventDescrip,"eventTime":time,"eventDate":dat,"eventID":element.eventId, "locationID": element.eventLocation })
  });
  console.log(arrayOFEvents);
  returnObject["eventData"] = arrayOFEvents;
  let locationIDSQL=`select * from location where locationID=${arrayOFEvents[0].locationID}`;
  connection.query(locationIDSQL, (err, result)=>{
    if (!err){
      var coordinates = JSON.parse(JSON.stringify(result));
      returnObject["eventData"][0]["locationX"] = coordinates[0].locationX;
      returnObject["eventData"][0]["locationY"] = coordinates[0].locationY;
      var eventCommentSQL="select c.*,u.firstname,u.lastname from eventcomment c inner join users u on u.userID=c.userID  where eventID="+req.query.event+"  order by timeComment ;";
      connection.query(eventCommentSQL, function (err, result) {
        var arrayP=[];
        console.log("JO:AAA")
        var results= JSON.parse(JSON.stringify(result));
        var dat ,time,eventTime=''
        results.forEach(element => {
        arrayP.push({"comment":element.commentDescrip,"Name":element.firstname+" "+element.lastname,"rating":element.rating})
        });
    returnObject["comments"] = arrayP;
    console.log(returnObject["comments"])
    console.log(returnObject);
    res.render('eventPage',{data:returnObject,comment:arrayP,user:req.query.user,event:req.query.event});

  });
    }
  })
  

});
})

app.post('/comment',(req,res)=>{
  console.log(req.body)
  var commentSQL="INSERT INTO `eventcomment`  (`eventID`,`userID`,`commentDescrip`,`rating`)VALUES("+req.query.event+","+req.query.user+" ,'"+req.body.comment+"',"+req.body.star+");"
  connection.query(commentSQL, function (err, result) {

    if(err)
    {
    var upcommentSQL="UPDATE eventcomment SET commentDescrip = '"+req.body.comment+"',rating = "+req.body.star+" WHERE eventID ="+req.query.event+" AND `userID`= "+req.query.user+"";
    connection.query(upcommentSQL, function (err, result) {
      console.log(upcommentSQL)
      res.redirect("/event?user="+req.query.user+"&event="+req.query.event)
    
    })
    }
    else{
    res.redirect("/event?user="+req.query.user+"&event="+req.query.event)
    }
  });

})
app.get('/createUniversity', (req, res)=>{
  res.render('createUniPage', {userName: req.query.user});
})
app.get('/createEvent',(req,res)=>{
  
  console.log("reach get create");
  if (req.query.user){
    let rsoSQL = `select r.RSOID, r.RSOName from rso r where r.adminId=${req.query.user}`; //succesfull
    connection.query(rsoSQL, (err, result) =>{
      if (err){
        console.log("error in rsoSQL");
        throw err;
      } else{
        var rsoList= JSON.parse(JSON.stringify(result));
        let locationSQL = `select locationID, locationDescrip from location`;
        connection.query(locationSQL, (err, result) =>{
          if (err){
            console.log("error in rsoSQL");
            throw err;
          } else{
            var locationList= JSON.parse(JSON.stringify(result));
            res.render("CreateEventPage", {RSOlist: rsoList,locationList:locationList, userName: req.query.user});
          }
        })
      }
    })

    
  }
  
})
app.get('/RSO', (req, res)=>{
  if (req.query.user){
    let rsoUserSQL=`select * from (Select r.* from RSO r Inner Join(Select univeristyID from users u where u.userID=${req.query.user})c on c.univeristyID=r.universityID) p where p.RSOID not in (select RSOID from userrso where userID=${req.query.user}) and p.RSOstatus=0`;
  connection.query(rsoUserSQL, (err, result)=>{
    if (err){
      console.log("error in rsousersql");
      throw err;
    } else {
      var results= JSON.parse(JSON.stringify(result));
      let ArsoUserSQL=`select * from (Select r.* from RSO r Inner Join(Select univeristyID from users u where u.userID=${req.query.user})c on c.univeristyID=r.universityID) p where p.RSOID not in (select RSOID from userrso where userID=${req.query.user}) and p.RSOstatus=1`;
      connection.query(ArsoUserSQL, (err, result)=>{
        if (err){
          console.log("error in rsousersql");
          throw err;
        } else {
          var Aresults= JSON.parse(JSON.stringify(result));

      res.render('RSOPage', {userName: req.query.user, RSOList: results,ActiveRSOList:Aresults});
    }});}
  })
  }
}) 
app.get('/createRSO',(req,res)=>{
  res.render('createRSOPage',{userName:req.query.user});
}) 
app.get('/',(req,res)=>{
 

  //var trendSQL = "Select * from CREATOR_EVENT ORDER BY ratingCount DESC LIMIT 10;";
  //Public
 var publicSql = "SELECT e.eventId,e.eventName,e.eventdate,e.eventTime,e.eventDescrip, l.locationX, l.locationY FROM uniEvents e, location l where e.eventType=4 and e.eventLocation = l.locationID";
 //Private 
 
 var returnObject ={}
  var arrayOFEvents =[]
//HELLOOO
  connection.query(publicSql, function (err, result) {
    var results= JSON.parse(JSON.stringify(result));
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
    arrayOFEvents.push({ "eventTitle": element.eventName,"eventDecrip":element.eventDescrip,"eventTime":time,"eventDate":dat,"eventID":element.eventId, "locationX": element.locationX, "locationY": element.locationY })

  });
returnObject["Public"] = arrayOFEvents;
console.log(returnObject);
if(req.query.user)
{
var userSQL ="Select * from users where userID="+req.query.user;
connection.query(userSQL, function (err, result) {
  if(err)
  {    res.render('mainPlatform',{ lists:returnObject ,userName:req.query.user});
}
  //var private ="Select uniID from studentinuniversity where studentID="+req.query.user;
  var results= JSON.parse(JSON.stringify(result))
  console.log(results)
  console.log(results[0].univeristyID)
  arrayOFEvents =[]
  if(results[0].univeristyID)
  {
    var privateSql = "SELECT e.eventId,e.eventName,e.eventdate,e.eventTime,e.eventDescrip, l.locationX, l.locationY FROM uniEvents e, location l where eventType=14 and e.eventLocation = l.locationID and uniID ="+results[0].univeristyID;
    console.log(privateSql)
      connection.query(privateSql, function (err, result2) {
        
        var results= JSON.parse(JSON.stringify(result2))
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
        arrayOFEvents.push({ "eventTitle": element.eventName,"eventDecrip":element.eventDescrip,"eventTime":time,"eventDate":dat ,"eventID":element.eventId, "locationX": element.locationX, "locationY": element.locationY })
            
      });
    returnObject["Private"] = arrayOFEvents; 
    var RSOsql=`select e.*, l.locationX,l.locationY from (SELECT e.eventLocation, e.eventId,e.eventName,e.eventdate,e.eventTime,e.eventDescrip,c.RSOName FROM uniEvents e INNER JOIN (SELECT r.RSOID,r.RSOName FROM userrso ur inner join rso r on ur.RSOID= r.RSOID where userID=${req.query.user}) c on e.RSOId=c.RSOID GROUP BY e.RSOId) e, location l where e.eventLocation = l.locationID`;
    console.log(RSOsql)
    connection.query(RSOsql, function (err, result) {
      arrayOFEvents =[]

          var results= JSON.parse(JSON.stringify(result))
          console.log(JSON.stringify(result));
          if(results.length!=0)
          {
          var curCat = results[0].RSOName
          }
          var dat ,time,eventTime=''
          results.forEach(element => {
            if(curCat == element.RSOName)
            {
              //NOTE SAVE DATE AS UTC
               dat=element.eventdate;
              dat =new Date(dat).toLocaleString('en', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              });
               time=new Date(dat).toLocaleTimeString();
              eventTime= time
              arrayOFEvents.push({ "eventTitle": element.eventName,"eventDecrip":element.eventDescrip,"eventTime":eventTime,"eventDate":dat ,"eventID":element.eventId,"locationX": element.locationX, "locationY": element.locationY})
              console.log( arrayOFEvents);
            }
            else
            {
              returnObject[curCat] = arrayOFEvents;
              arrayOFEvents=[];
               dat=element.eventdate;
              dat =new Date(dat).toLocaleString('en', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              });
               time=new Date(dat).toLocaleTimeString();
              eventTime= time
              arrayOFEvents.push({ "eventTitle": element.eventName,"eventDecrip":element.eventDescrip,"eventTime":eventTime,"eventDate":dat,"eventID":element.eventId,"locationX": element.locationX, "locationY": element.locationY })
              curCat=element.RSOName;
            }
          
          });
      
          returnObject[curCat] = arrayOFEvents;
          res.render('mainPlatform',{ lists:returnObject ,userName:req.query.user});

        });

    });
  }
  else{
    res.render('mainPlatform',{ lists:returnObject ,userName:req.query.user});
  }
});
}
else
{
  res.render('mainPlatform',{ lists:returnObject ,userName:req.query.user});

}
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
 

app.post('/RSO', (req, res)=>{
  if (req.query.user && req.query.rso){
    let userrsosql = `insert into userrso(userID, RSOID) values(${req.query.user}, ${req.query.rso})`;
    connection.query(userrsosql, (err, result) =>{
      if (err){
        console.log(err);
        throw err;
      } else {
        // update number of student of the rso when user join
        let updateStudentNumSQL = `UPDATE rso SET numberOfStudents= numberOfStudents + 1 where RSOID=${req.query.user}`;
        connection.query(updateStudentNumSQL, (err, result)=>{
          if (err){
            console.log("error in studentNumSQL");
            throw err;
          } else {
            //var studentNum= JSON.parse(JSON.stringify(result));
            let studentNumSQL = `select numberOfStudents from rso where RSOID=${req.query.rso}`;
            connection.query(studentNumSQL, (err, result)=>{
              if (err){
                console.log("error in studentNumSQL");
                throw err;
              } else {
                var studentNum= JSON.parse(JSON.stringify(result));
                if (studentNum[0].numberOfStudents >= 5){
                  // when there is more than 1 host and 4 other students in rso
                  let updateRSOstatusSQL = `UPDATE rso SET  RSOstatus=1 where RSOID =${req.query.rso}`;
                  connection.query(updateRSOstatusSQL, (err, result)=>{
                    if (err){
                      console.log("error in updateRSOstatus");
                      throw err;
                    } else {
                      res.redirect(`/RSO?user=${req.query.user}`);
                    }
                  })
                } else {
                  // when there is not enough people in rso
                  res.redirect(`/RSO?user=${req.query.user}`);
                }
              }
            })
          }
        })
      }
    })
  }
})
app.post('/createRSO', [
  check('rsoName','Event cannot be empty').exists().isLength({min:1}),
  check('rsoDescription','Description cannot be empty').exists().isLength({min:1})
], function(req, res) {
    console.log(req.query.user);
    const error= validationResult(req)
    if(!error.isEmpty())
    {
      const alert = error.array()
      res.render('createRSOPage',{
        alert, userName: req.query.user
      })
      console.log("error")
    } else{
      if(req.query.user){
        let unisql = `select univeristyID from users where userID=${req.query.user}`;
        connection.query(unisql, function (err, result){
          if (err){
            console.log("error in unisql");
            throw err;
          } 
          else {
            let results= JSON.parse(JSON.stringify(result));
            
            let object= req.body;
            
            let rsosql = `insert into rso(adminId, RSOName, RSODescrip, universityID, RSOstatus, numberOfStudents) values (${req.query.user},'${object.rsoName}','${object.rsoDescription}', ${results[0].univeristyID},0,1)`;
            
            connection.query(rsosql, function(err, result){
              // let results= JSON.parse(JSON.stringify(result));
              if (err){
                console.log("error in rsosql");
                throw err;
              } 
              else {
                let RSOIdsql = `select RSOID from rso where RSOName='${object.rsoName}'`;
                
                connection.query(RSOIdsql,(err,result)=>{
                  if (err) {
                    console.log("error in userrso");
                    throw err
                  } else {
                    let results= JSON.parse(JSON.stringify(result));
                    let userrsoSQL = `insert into userrso(userID, RSOID) values(${req.query.user}, ${results[0].RSOID})`;
                    connection.query(userrsoSQL,(err,result)=>{
                      if (err) {
                        console.log("error in userrso");
                        throw err
                      } else {
                        res.redirect(`/?user=${req.query.user}`);
                      }
                    })
                  }
                })
                
              }
            })
          }

        })
      } else {
        console.log("query not found")
      }
    }

})
app.post('/createUniversity',[
  check('uniName', 'University Name cannot be empty').exists().isLength({min:1}),
  check('uniDescription', 'University Description cannot be empty').exists().isLength({min:1}),
  check('uniLocation', 'University Location cannot be empty').exists().isLength({min:1}),
  //check('uniPictureLink', 'University Picture Link cannot be empty').exists().isLength({min:1}),
  check('uniEmailDomain', 'University Email Domain cannot be empty').exists().isLength({min:1}),
], (req, res)=>{
  const error= validationResult(req)
  if(!error.isEmpty())
  {
    const alert = error.array()
    res.render('createUniPage',{
      alert
    })
    console.log("error")
  } else {
    let object = req.body;
    if (req.query.user){
      let unisql=`insert into university(universityName, uniDescription, uniLocation, uniPictureLink, userCreated, uniEmailDomain) values('${object.uniName}', '${object.uniDescription}', '${object.uniLocation}', '${object.uniPictureLink}', ${req.query.user}, '${object.uniEmailDomain}')`;
      connection.query(unisql, (err, result)=>{
        if (err) {
          console.log("error in unisql");
          throw err;
        } else{
          res.redirect(`/?user=${req.query.user}`);
        }
      })
    }
  }
})

app.post('/createEvent',[
  check('eventName','Event cannot be empty').exists().isLength({min:1}),
  check('contactEmail','Email is invalid').isEmail().normalizeEmail(),
  check('eventDescription','Description cannot be empty').exists().isLength({min:1}),
  check('eventCat','Category cannot be empty').exists().isLength({min:1}),
  check('eventDate','Please specify date for the event').exists().isLength({min:1}),
  check('eventTime','Please specify time for the event').exists().isLength({min:1}),
  check('contactPhoneNumber', 'Please insert contact phone number').exists().isLength({min:1})
  
], function(req, res){ // Specifies which URL to listen for
    // req.body -- contains form data

    console.log(req);
    const error= validationResult(req);
    console.log(error);
    if(!error.isEmpty())
    {
      const alert = error.array()
      let rsoSQL = `select r.RSOID, r.RSOName from rso r where r.adminId=${req.query.user}`; //succesfull
      connection.query(rsoSQL, (err, result) =>{
        if (err){
          console.log("error in rsoSQL");
          throw err;
        } else{
          var rsoList= JSON.parse(JSON.stringify(result));
          let locationSQL = `select locationID, locationDescrip from location`;
          connection.query(locationSQL, (err, result) =>{
            if (err){
              console.log("error in rsoSQL");
              throw err;
            } else{
              var locationList= JSON.parse(JSON.stringify(result));
              res.render("CreateEventPage", {alert,RSOlist: rsoList,locationList:locationList, userName: req.query.user});
            }
          })
        }
      })
      console.log("error")
    } else{
      let object= req.body;
      console.log("eventype is " + object.eventType);
      if(req.query.user){
        let uniIDsql = `select univeristyID from users where userID=${req.query.user}`;
        connection.query(uniIDsql, (err, result)=>{
          if (err){
 let rsoSQL = `select r.RSOID, r.RSOName from rso r where r.adminId=${req.query.user}`; //succesfull
    connection.query(rsoSQL, (err, result) =>{
      if (err){
        console.log("error in rsoSQL");
        throw err;
      } else{
        var rsoList= JSON.parse(JSON.stringify(result));
        let locationSQL = `select locationID, locationDescrip from location`;
        connection.query(locationSQL, (err, result) =>{
          if (err){
            console.log("error in rsoSQL");
            throw err;
          } else{
            var locationList= JSON.parse(JSON.stringify(result));
            res.render("CreateEventPage", {RSOlist: rsoList,locationList:locationList, userName: req.query.user});
          }
        })
      }
    })          } else {
            var uniID = JSON.parse(JSON.stringify(result));
            let correctLocationID;
            if (object.locationList == -1){
              let insertsql = `insert into location(locationX, locationY, locationDescrip) values(${object.xCoordinate}, ${object.yCoordinate}, '${object.locationDescrip}')`;
              connection.query(insertsql, (errI, result) =>{
                if (errI){
                  let rsoSQL = `select r.RSOID, r.RSOName from rso r where r.adminId=${req.query.user}`; //succesfull
                  connection.query(rsoSQL, (err, result) =>{
                    if (err){
                      console.log("error in rsoSQL");
                      throw err;
                    } else{
                      var rsoList= JSON.parse(JSON.stringify(result));
                      let locationSQL = `select locationID, locationDescrip from location`;
                      connection.query(locationSQL, (err, result) =>{
                        if (err){
                          console.log("error in rsoSQL");
                          throw err;
                        } else{
                          var locationList= JSON.parse(JSON.stringify(result));
                          const alert = error.array()

                          res.render("CreateEventPage", {alert,RSOlist: rsoList,locationList:locationList, userName: req.query.user});
                        }
                      })
                    }
                  })                }
                else {
                  let selectlocationID = `select locationID from location where locationX=${object.xCoordinate} and locationY=${object.yCoordinate}`;
                  connection.query(selectlocationID, (err, result)=>{
                    if (err){
                      throw err;
                    } else{
                      var newLocationId = JSON.parse(JSON.stringify(result));
                      correctLocationID = newLocationId[0].locationID;
                      if (object.eventType==4){
                        // when event type is public
                        let publicEventSQL = `insert into unievents(eventType, eventName, eventDescrip, eventLocation, eventDate, eventPhone, eventEmail, eventTime, eventcategory ) values(${object.eventType},'${object.eventName}','${object.eventDescription}', ${correctLocationID},'${object.eventDate}','${object.contactPhoneNumber}','${object.contactEmail}', '${object.eventTime}', '${object.eventCat}')`;
                        connection.query(publicEventSQL, (err1, result) =>{
                          if (err1){
                  let rsoSQL = `select r.RSOID, r.RSOName from rso r where r.adminId=${req.query.user}`; //succesfull
                  connection.query(rsoSQL, (err, result) =>{
                    if (err){
                      console.log("error in rsoSQL");
                      throw err;
                    } else{
                      var rsoList= JSON.parse(JSON.stringify(result));
                      let locationSQL = `select locationID, locationDescrip from location`;
                      connection.query(locationSQL, (err, result) =>{
                        if (err){
                          console.log("error in rsoSQL");
                          throw err;
                        } else{
                          var locationList= JSON.parse(JSON.stringify(result));
                          const alert = [{msg:err1}]

                          res.render("CreateEventPage", {alert,RSOlist: rsoList,locationList:locationList, userName: req.query.user});
                        }
                      })
                    }
                  })   
                          } else {
                            res.redirect(`/?user=${req.query.user}`);
                          }
                        })
                      } else if (object.eventType == 14 ){
                        // when event type is private
                        let privateEventSQL = `insert into unievents(uniID, eventType, eventName, eventDescrip, eventLocation, eventDate, eventPhone, eventEmail, eventTime, eventcategory ) values(${uniID[0].univeristyID},${object.eventType},'${object.eventName}','${object.eventDescription}', ${correctLocationID},'${object.eventDate}','${object.contactPhoneNumber}','${object.contactEmail}', '${object.eventTime}','${object.eventCat}')`;
                        connection.query(privateEventSQL, (err2, result) =>{
                          if (err2){
                            console.log("error in privatesql");
                            let rsoSQL = `select r.RSOID, r.RSOName from rso r where r.adminId=${req.query.user}`; //succesfull
                            connection.query(rsoSQL, (err, result) =>{
                              if (err){
                                console.log("error in rsoSQL");
                                throw err;
                              } else{
                                var rsoList= JSON.parse(JSON.stringify(result));
                                let locationSQL = `select locationID, locationDescrip from location`;
                                connection.query(locationSQL, (err, result) =>{
                                  if (err){
                                    console.log("error in rsoSQL");
                                    throw err;
                                  } else{
                                    var locationList= JSON.parse(JSON.stringify(result));
                                    const alert = [{msg:err2}]
          
                                    res.render("CreateEventPage", {alert,RSOlist: rsoList,locationList:locationList, userName: req.query.user});
                                  }
                                })
                              }
                            })   
                                                    } else {
                            res.redirect(`/?user=${req.query.user}`);
                          }
                        })
                      } else if (object.eventType == 24){
                        // when event type is RSO
                        let rsoEventSQL = `insert into unievents(uniID,RSOId, eventType, eventName, eventDescrip, eventLocation, eventDate, eventPhone, eventEmail, eventTime, eventcategory ) values(${uniID[0].univeristyID},${object.RSOList},${object.eventType},'${object.eventName}','${object.eventDescription}', ${correctLocationID},'${object.eventDate}','${object.contactPhoneNumber}','${object.contactEmail}', '${object.eventTime}', '${object.eventCat}')`;
                        connection.query(rsoEventSQL, (err3, result) =>{
                          if (err3){
                            let rsoSQL = `select r.RSOID, r.RSOName from rso r where r.adminId=${req.query.user}`; //succesfull
                  connection.query(rsoSQL, (err, result) =>{
                    if (err){
                      console.log("error in rsoSQL");
                      throw err;
                    } else{
                      var rsoList= JSON.parse(JSON.stringify(result));
                      let locationSQL = `select locationID, locationDescrip from location`;
                      connection.query(locationSQL, (err, result) =>{
                        if (err){
                          console.log("error in rsoSQL");
                          throw err;
                        } else{
                          var locationList= JSON.parse(JSON.stringify(result));
                          const alert = [{msg:err3}]

                          res.render("CreateEventPage", {alert,RSOlist: rsoList,locationList:locationList, userName: req.query.user});
                        }
                      })
                    }
                  })   
                          } else {
                            res.redirect(`/?user=${req.query.user}`);
                          }
                        })
                      } else{
                       console.log('evenType invalid');
                     } 
                    }
                  })
                }
              })
            } else {
              correctLocationID = object.locationList;
            
            if (object.eventType==4){
              // when event type is public
              let publicEventSQL = `insert into unievents(eventType, eventName, eventDescrip, eventLocation, eventDate, eventPhone, eventEmail, eventTime, eventcategory ) values(${object.eventType},'${object.eventName}','${object.eventDescription}', ${correctLocationID},'${object.eventDate}','${object.contactPhoneNumber}','${object.contactEmail}', '${object.eventTime}', '${object.eventCat}')`;
              connection.query(publicEventSQL, (err5, result) =>{
                if (err5){
                  let rsoSQL = `select r.RSOID, r.RSOName from rso r where r.adminId=${req.query.user}`; //succesfull
                  connection.query(rsoSQL, (err, result) =>{
                    if (err){
                      console.log("error in rsoSQL");
                      throw err;
                    } else{
                      var rsoList= JSON.parse(JSON.stringify(result));
                      let locationSQL = `select locationID, locationDescrip from location`;
                      connection.query(locationSQL, (err, result) =>{
                        if (err){
                          console.log("error in rsoSQL");
                          throw err;
                        } else{
                          var locationList= JSON.parse(JSON.stringify(result));
                          const alert = [{msg:err5}]
                          console.log(alert)
                          res.render("CreateEventPage", {alert,RSOlist: rsoList,locationList:locationList, userName: req.query.user});
                        }
                      })
                    }
                  })   
                } else {
                  res.redirect(`/?user=${req.query.user}`);
                }
              })
            } else if (object.eventType == 14 ){
              // when event type is private
              let privateEventSQL = `insert into unievents(uniID, eventType, eventName, eventDescrip, eventLocation, eventDate, eventPhone, eventEmail, eventTime, eventcategory ) values(${uniID[0].univeristyID},${object.eventType},'${object.eventName}','${object.eventDescription}', ${correctLocationID},'${object.eventDate}','${object.contactPhoneNumber}','${object.contactEmail}', '${object.eventTime}','${object.eventCat}')`;
              connection.query(privateEventSQL, (err6, result) =>{
                if (err6){
                  let rsoSQL = `select r.RSOID, r.RSOName from rso r where r.adminId=${req.query.user}`; //succesfull
                  connection.query(rsoSQL, (err, result) =>{
                    if (err){
                      console.log("error in rsoSQL");
                      throw err;
                    } else{
                      var rsoList= JSON.parse(JSON.stringify(result));
                      let locationSQL = `select locationID, locationDescrip from location`;
                      connection.query(locationSQL, (err, result) =>{
                        if (err){
                          console.log("error in rsoSQL");
                          throw err;
                        } else{
                          var locationList= JSON.parse(JSON.stringify(result));
                          const alert = [{msg:err6}]

                          res.render("CreateEventPage", {alert,RSOlist: rsoList,locationList:locationList, userName: req.query.user});
                        }
                      })
                    }
                  })   
                } else {
                  res.redirect(`/?user=${req.query.user}`);
                }
              })
            } else if (object.eventType == 24){
              // when event type is RSO
              let rsoEventSQL = `insert into unievents(uniID,RSOId, eventType, eventName, eventDescrip, eventLocation, eventDate, eventPhone, eventEmail, eventTime, eventcategory ) values(${uniID[0].univeristyID},${object.RSOList},${object.eventType},'${object.eventName}','${object.eventDescription}', ${correctLocationID},'${object.eventDate}','${object.contactPhoneNumber}','${object.contactEmail}', '${object.eventTime}', '${object.eventCat}')`;
              connection.query(rsoEventSQL, (err7, result) =>{
                if (err7){
                  let rsoSQL = `select r.RSOID, r.RSOName from rso r where r.adminId=${req.query.user}`; //succesfull
                  connection.query(rsoSQL, (err, result) =>{
                    if (err){
                      console.log("error in rsoSQL");
                      throw err;
                    } else{
                      var rsoList= JSON.parse(JSON.stringify(result));
                      let locationSQL = `select locationID, locationDescrip from location`;
                      connection.query(locationSQL, (err, result) =>{
                        if (err){
                          console.log("error in rsoSQL");
                          throw err;
                        } else{
                          var locationList= JSON.parse(JSON.stringify(result));
                          const alert = [{msg:err7}]

                          res.render("CreateEventPage", {alert,RSOlist: rsoList,locationList:locationList, userName: req.query.user});
                        }
                      })
                    }
                  })   
                } else {
                  res.redirect(`/?user=${req.query.user}`);
                }
              })
            } else{
             console.log('evenType invalid');
           } 
          }
          }
        })
      } else {
       console.log("query not found")
      }
    }
  })
app.post('/signUpProcess',[
  check('passwordInput','Pasword must be 8+ characters long').exists().isLength({min:8}),
  check('emailInput','Email is invalid').isEmail().normalizeEmail(),
  check('firstNmeInput','First Name cannot be empty').exists().isLength({min:1}),
  check('lastNmeInput','Last Name cannot be empty').exists().isLength({min:1})
], function(req, res){ // Specifies which URL to listen for
    // req.body -- contains form datass
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
    var sql = "insert into users(firstname,lastname,email,userPassword,userType) Values ('"+object.firstNmeInput+"','"+object.lastNmeInput+"','"+object.emailInput+"','"+object.passwordInput+"',24)";
    connection.query(sql, function (err, result) {
      if (err) throw err;
      var sql = "Select firstname,lastname,userID from USERS where email='"+object.emailInput+"'AND userPassword='"+object.passwordInput+"'";
      connection.query(sql, function (err, result) {
        var results= JSON.parse(JSON.stringify(result))
  
        if (err) throw err;
          console.log(results+"HELLOOOOO"); 
        if(results)
        {
       res.redirect("/?user="+results[0].userID);
        }});
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
