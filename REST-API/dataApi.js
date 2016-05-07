var http = require('http');
var fs = require('fs');
var oracledb = require('oracledb');
var express = require('express');
var bodyParser = require('body-parser') // npm install body-parser
var json2csv = require('json2csv'); /* https://www.npmjs.com/package/json2csv , http://stackoverflow.com/questions/30292930/how-can-i-cause-a-newly-created-csv-file-to-be-downloaded-to-the-user, http://stackoverflow.com/questions/17450412/how-to-create-an-excel-file-with-nodejs, https://www.npmjs.com/package/json2csv   */
var app = express();

var PORT = process.env.PORT || 3000;
var APP_VERSION = '0.0.1.71';

//CORS middleware - taken from http://stackoverflow.com/questions/7067966/how-to-allow-cors-in-express-node-js
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Credentials', true);
 
    next();
}


app.listen(PORT, function () {
  console.log('Server running, version '+APP_VERSION+', Express is listening... at '+PORT+" for /departments and /sessions");
});
// 1.41 disabled:  app.use(bodyParser());
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.text({ type: 'text/xml' }));
app.use(allowCrossDomain);


app.use(express.static(__dirname + '/public'))
app.get('/about', function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write("Version "+APP_VERSION+". No Data Requested, so none is returned; try /departments or /sessions or something else");
    res.write("Supported URLs:");
    res.write("/sessions , /sessions?search=YourSearchTerm, /sessions/<sessionId>, POST for sessions  with JSON body {  'filterTags' : ['SQL'], 'searchTerm': 'your term'} ");
    res.write("/speakers , /speakers?search=YourSearchTerm, /speakers/<speakerId>"); 
    res.write("/tags , POST for tags with JSON body { 'tagCategories' : ['content','duration'] , 'filterTags' : ['SQL']} "); 
    res.end();
});

app.get('/departments', function(req,res){ handleAllDepartments(req, res);} );
app.get('/app/bth-speakers', function(req,res){ generateAppSpeakers(req, res);} );
app.get('/app/bth-sessions', function(req,res){ generateAppSessions(req, res);} );
app.get('/app/bth-schedule', function(req,res){ generateAppSchedule(req, res);} );


app.get('/sessions', function(req,res){ handleAllSessions(req, res, null, req.query.search);} );
app.get('/sessions/:sessionId', function(req,res){
    var sessionId = req.params.sessionId;
    handleSession(req, res, sessionId);
}); 
app.post('/sessions', function(req,res){
       handleAllSessions(req, res, req.body.filterTags, req.body.searchTerm,  req.body.speakers);
} );

app.get('/all', function(req,res){
       handleAll(req, res);
} );

app.post('/planning', function(req,res){
       handlePlanning(req, res, req.body.conferenceRound, req.body.conferenceRoom, req.body.conferenceDay,  req.body.conferenceTime);
} );


app.get('/sessions/related/:sessionId', function(req,res){
    var sessionId = req.params.sessionId;
    handleRelatedSessions(req, res, sessionId);
}); 


app.get('/speakers', function(req,res){ handleAllSpeakers(req, res);} );
app.get('/speakers/:speakerId', function(req,res){
    var speakerId = req.params.speakerId;
    handleSpeaker(req, res, speakerId);
}); 

app.get('/tags', function(req,res){ 
     handleAllTags(req, res,null,null,req.query.search);
    } );
//function handleAllTags(request, response, filterTags, tagCategories, searchTerm) {

app.post('/tags', function(req,res){
       handleAllTags(req, res, req.body.filterTags, req.body.tagCategories, req.body.searchTerm);
} );


app.get('/departments/:departmentId', function(req,res){
    var departmentIdentifier = req.params.departmentId;
    handleDatabaseOperation( req, res, function (request, response, connection) {
	  var selectStatement = "SELECT employee_id, first_name, last_name, job_id FROM employees where department_id= :department_id";
	  connection.execute(   selectStatement   
		, [departmentIdentifier], {
            outFormat: oracledb.OBJECT // Return the result as Object
        }, function (err, result) {
            if (err) {
			  console.log('Error in execution of select statement'+err.message);
              response.writeHead(500, {'Content-Type': 'application/json'});
              response.end(JSON.stringify({
                status: 500,
                    message: "Error getting the employees for the department "+departmentIdentifier,
                    detailed_message: err.message
               })
	          );  
            } else {
		       console.log('db response is ready '+result.rows);
               response.writeHead(200, {'Content-Type': 'application/json'});
               response.end(JSON.stringify(result.rows));
              }
			doRelease(connection);
          }
	  );
	});
} );



function generateAppSpeakers(request, response) {
    console.log("produce app data - speakers  ");
    getAll(request, response, function (err, bthJson) {  


               var fieldNames = ['ID','Tags'            , 'title','company', 'firstname','tussenvoegsel','lastname','email','position','image','description','phone','website','linkedInUrl','twitterurl'];  
               var fields     = ['id', 'communityTitles', 'X'    ,'company', 'firstName','X'            ,'lastName','X'    ,'X'       ,'X'    ,'biography'  ,'X'    ,'X'      ,'X'          ,'X'];
               json2csv({ data:  bthJson.speakers, fields: fields,fieldNames: fieldNames , del: '\t'  }, function(err, csv) {
                   if (err) {
                      console.log(err);
                      response.writeHead(500, {'Content-Type': 'application/json'});
                      response.end(JSON.stringify({
                        status: 500,
                        message: "Error getting the data for the app",
                        detailed_message: err.message
                      })
	                  );  
                   }
                  else { 
                   // explicitly treat incoming data as utf8 (avoids issues with multi-byte chars)
                  response.set({
                      'Content-Disposition': 'attachment; filename=bth-speakers.xls',
                      'Content-Type': 'text/csv; charset=utf-8'
                  });
                  // \ufeff is to establish the content of the file is actually UTF-8 encoded; Excel seems to like it that way: http://stackoverflow.com/questions/17879198/adding-utf-8-bom-to-string-blob, 
                  response.send("\ufeff"+csv);
                  }  
               });//json2csv
               
    });//getAll
}// generateAppSpeakers



function generateAppSessions(request, response) {
    console.log("produce app data - sessions  ");
    getAll(request, response, function (err, bthJson) {  
              // process and group by track
              // iterate through all sessions - build new object              
 var tracks = {};
 bthJson.sessions.forEach (function (session){
    if (!tracks[session.track]) {
        tracks[session.track] = {"sessions": []}
    }
    tracks[session.track].sessions.push(session);
});
console.log('==================================  tracks');
console.log(JSON.stringify(tracks));
 
 var csvJson =[];
 for (track in tracks) {
   console.log('Track: '+track);
   console.log("number of sessions "+tracks[track].sessions.length);
   var t = { };
   t.tags=track;
   var sessionIds =[];
   tracks[track].sessions.forEach (function (session){
      sessionIds.push(session.sessionAppIdentifier);
   });
   t.sessionIds = sessionIds.toString();
   t.isSession = 'FALSE';
   csvJson.push(t);
   tracks[track].sessions.forEach (function (session){
      var s = {}; 
      s.sessionId = session.sessionAppIdentifier;
      s.tags  = session.tags.toString();
      s.title = session.title;
      if (session.planning.slotDate) {
        s.scheduleItemStartDateTime = session.planning.slotDate+' '+session.planning.sessionStartTime;
        s.scheduleItemEndDateTime = session.planning.slotDate+' '+session.planning.sessionEndTime;
        s.locationName = session.planning.room;
      }
      s.abstract = session.abstract;
      s.isSession = 'TRUE';
      var skrs =[];
      session.speakers.forEach (function (speaker){
          console.log('speaker '+speaker.lastName);
        skrs.push(speaker.id);
      });
      s.speakers = skrs.toString();
      s.track  = session.track;
      s.targetAudience  = session.targetAudience;
      s.sessionType =( session.duration=='.5'? 'Quickie':(session.duration=='2'? 'Master Class':'Regular'));
      csvJson.push(s);
    });// all sessions in track     
 }; // all tracks
 var fields=  [
    {
      label: 'ID', // (optional, column will be labeled 'path.to.something' if not defined) 
      value: 'sessionId', // data.path.to.something 
      default: '' // default if value is not found (optional, overrides `defaultValue` for column) 
    },
    {
      label: 'tags', // (optional, column will be labeled 'path.to.something' if not defined) 
      value: 'tags', // data.path.to.something 
      default: 'NULL' // default if value is not found (optional, overrides `defaultValue` for column) 
    },
    {
      label: 'title', // (optional, column will be labeled 'path.to.something' if not defined) 
      value: 'title', // data.path.to.something 
      default: 'NULL' // default if value is not found (optional, overrides `defaultValue` for column) 
    },
    {
      label:    'scheduleItemStartDateTime', 
      value:'scheduleItemStartDateTime'
      ,
      default: '-' // default if value fn returns falsy 
    } 
    , {
      label: 'scheduleItemEndDateTime', 
      value: 'scheduleItemEndDateTime',
      default: '-' // default if value fn returns falsy 
    } 
    , {
      label: 'location-name', 
      value: 'locationName',
      default: '-' // default if value fn returns falsy 
    } 
    , {
      label: 'description', 
      value: 'abstract',
      default: 'NULL' // default if value fn returns falsy 
    } 
    , {
      label: 'Is Session', 
      value: 'isSession',
      default: 'TRUE' // default if value fn returns falsy 
    } 
    , {
      label: 'sessions', 
      value: 'sessionIds',
      default: 'null' // default if value fn returns falsy 
    } 
    , {
      label: 'speakers', // comma separated list of id's for all speakers associated with this session
      value: 'speakers'
      ,
      default: 'NULL' // default if value fn returns falsy 
    } 
    , {
      label: 'Track', // comma separated list of id's for all speakers associated with this session
      value: 'track'
      ,
      default: '' // default if value fn returns falsy 
    } 
    , {
      label: 'targetAudience', // comma separated list of id's for all speakers associated with this session
      value: 'targetAudience'
      ,
      default: '' // default if value fn returns falsy 
    } 
    , {
      label: 'session duration', // comma separated list of id's for all speakers associated with this session
      value: 'sessionType'
      ,
      default: '' // default if value fn returns falsy 
    } 
  ];                                             
               json2csv({ data:  csvJson, fields: fields, del: '\t'  }, function(err, csv) {
                   if (err) {
                      console.log(err);
                      response.writeHead(500, {'Content-Type': 'application/json'});
                      response.end(JSON.stringify({
                        status: 500,
                        message: "Error getting the data for the app",
                        detailed_message: err.message
                      })
	                  );  
                   }
                  else { 
                   // explicitly treat incoming data as utf8 (avoids issues with multi-byte chars)
                  response.set({
                      'Content-Disposition': 'attachment; filename=bth-sessions.xls',
                      'Content-Type': 'text/csv; charset=utf-8'
                  });
                  // \ufeff is to establish the content of the file is actually UTF-8 encoded; Excel seems to like it that way: http://stackoverflow.com/questions/17879198/adding-utf-8-bom-to-string-blob, 
                  response.send("\ufeff"+csv);
                  }  
               });//json2csv
                       });
}// generateAppSessions

function findNextSlot(slotId, slots) {
    // slots are ordered according to time
    for (var i=0;i<slots.length;i++) {
        if (slots[i].slotId == slotId) {
            return slots[i+1].slotId;
        }
    }
  return;    
}

function generateAppSchedule(request, response) {
    console.log("produce app data - schedule  ");
    getAll(request, response, function (err, bthJson) {  
 var csvJson =[];
 var slots = {};
 bthJson.slots.forEach (function (slot){
    slots['slt'+slot.slotId] = slot;
    }
 );// forEach Slot
 bthJson.sessions.forEach (function (session){
    if (session.planning.sltId) {
        if (!slots['slt'+session.planning.sltId]) {
            slots['slt'+session.planning.sltId]={};
        }
        //TODO - add all speakers
        var speakers = '';
        
        session.speakers.forEach(function (speaker){
          speakers = speakers + ','+speaker.firstName+' '+speaker.lastName
          }
        );// forEach speaker
        speakers = speakers.substring(1);
        slots['slt'+session.planning.sltId]['rom'+session.planning.romId]=
        (session.planning.sessionDuration=='2'?'(Masterclass) ': (session.planning.sessionDuration=='.5'?'(Quickie) ':''))
  +       session.title+' - '
        + speakers
        +' ('+ session.track + ')' 
        ;
        
        // find 
        if (session.planning.sessionDuration=='2') {
            // find next slot in same room
             var nextSlotId = findNextSlot(session.planning.sltId, bthJson.slots);
             console.log('found next slot id '+nextSlotId);
             
            // then set this slot to the same  label
        slots['slt'+nextSlotId]['rom'+session.planning.romId]=
        (session.planning.sessionDuration=='2'?'(Masterclass - Part 2) ': (session.planning.sessionDuration=='.5'?'(Quickie) ':''))
  +       session.title+' - '
        + speakers
        +' ('+ session.track + ')' 
        ;

        }
    }   
 });    

 bthJson.slots.forEach (function (slot){
    var s =  {"slotLabel": slot.slotLabel, "slotStartTime": slot.slotStartTime, "slotEndTime": slot.slotEndTime
                  };
    bthJson.rooms.forEach (function (room){
      s['rom'+room.roomId] = slot['rom'+room.roomId];     
    } 
   );// forEach room
     
    csvJson.push( s);
    }
 );// forEach Slot
 
    var fields=  [
    {
      label: 'Slot', // (optional, column will be labeled 'path.to.something' if not defined) 
      value: 'slotLabel', // data.path.to.something 
      default: '' // default if value is not found (optional, overrides `defaultValue` for column) 
    },
    {
      label: 'Start Time', // (optional, column will be labeled 'path.to.something' if not defined) 
      value: 'slotStartTime', // data.path.to.something 
      default: '' // default if value is not found (optional, overrides `defaultValue` for column) 
    },
    {
      label: 'End Time', // (optional, column will be labeled 'path.to.something' if not defined) 
      value: 'slotEndTime', // data.path.to.something 
      default: '' // default if value is not found (optional, overrides `defaultValue` for column) 
    } 
  ];                 
  
 bthJson.rooms.forEach (function (room){
    fields.push(
         {
      label: room.roomLabel, 
      value: 'rom'+room.roomId, // data.path.to.something 
      default: '-' // default if value is not found (optional, overrides `defaultValue` for column) 
    }         
    );
 } 
 );// forEach room
  
               
               
               json2csv({ data:  csvJson, fields: fields, del: '\t'  }, function(err, csv) {
                   if (err) {
                      console.log(err);
                      response.writeHead(500, {'Content-Type': 'application/json'});
                      response.end(JSON.stringify({
                        status: 500,
                        message: "Error getting the data for the app",
                        detailed_message: err.message
                      })
	                  );  
                   }
                  else { 
                    response.set({
                            'Content-Disposition': 'attachment; filename=bth-schedule.xls',
                            'Content-Type': 'text/csv; charset=utf-8'
                        });
                        // \ufeff is to establish the content of the file is actually UTF-8 encoded; Excel seems to like it that way: http://stackoverflow.com/questions/17879198/adding-utf-8-bom-to-string-blob, 
                    response.send("\ufeff"+csv);


                  }  
               });//json2csv
        });//getAll
}// generateAppSchedule


function handleAllDepartments(request, response) {
    console.log("handle all departments ");
    handleDatabaseOperation( request, response, function (request, response, connection) {
	  var departmentName = request.query.name ||'%';

	  var selectStatement = "SELECT department_id, department_name FROM departments where department_name like :department_name";
	  connection.execute(   selectStatement   
		, [departmentName], {
            outFormat: oracledb.OBJECT // Return the result as Object
        }, function (err, result) {
            if (err) {
			  console.log('Error in execution of select statement'+err.message);
              response.writeHead(500, {'Content-Type': 'application/json'});
              response.end(JSON.stringify({
                status: 500,
                    message: "Error getting the departments",
                    detailed_message: err.message
               })
	          );  
            } else {
		       console.log('db response is ready '+result.rows);
               response.writeHead(200, {'Content-Type': 'application/json'});
               response.end(JSON.stringify(result.rows));
              }
			doRelease(connection);
          }
	  );

	});
} //handleAllDepartments


function handlePlanning(request, response, roundId, roomId, conferenceDay, conferenceTime) {
    
    console.log('planning , for round '+roundId+ " and roomId "+roomId+" and day and time  "+conferenceDay+"- "+conferenceTime );
    handleDatabaseOperation( request, response, function (request, response, connection) {

	  var selectStatement = "select lines.column_value line from   table(bth_util.clob_to_string_tbl_t(bth_planning_api.json_pln_tbl_summary( p_plan_items=>  bth_planning_api.get_planning( p_round => :roundId, p_room => :roomId, p_day => :day, p_time => :time)))) lines";
	  connection.execute(   selectStatement   
		, [roundId, roomId, conferenceDay,conferenceTime], {
            outFormat: oracledb.OBJECT // Return the result as Object
        }, function (err, result) {
            if (err) {
			  console.log('Error in execution of select statement'+err.message);
              response.writeHead(500, {'Content-Type': 'application/json'});
              response.end(JSON.stringify({
                status: 500,
                    message: "Error getting the sessions",
                    detailed_message: err.message
               })
	          );  
            } else {
               response.writeHead(200, {'Content-Type': 'application/json'});
               // all rows in result consist of a property with a LINE object; all the line objects should be glued together to form a single string that can be JSON parsed
               var json='';
               for (var i=0;i< result.rows.length;i++) {
                   json=json + result.rows[i].LINE;
               }// for
               var sessions = JSON.parse(json);
               response.end(JSON.stringify(sessions));
              }
			doRelease(connection);
          }
	  );

	});
} //handlePlanning

function handleAllSessions(request, response, filterTags, searchTerm, speakers) {
    
    console.log('all sessions , for search term '+searchTerm+ " and filterTags "+JSON.stringify(filterTags)+" and speakers "+speakers);
    handleDatabaseOperation( request, response, function (request, response, connection) {
//	  var departmentName = request.query.name ||'%';

	  var selectStatement = "select lines.column_value line from   table(bth_util.clob_to_string_tbl_t(bth_sessions_api.json_session_tbl_summary( p_sessions=>  bth_sessions_api.get_sessions( p_tags => :filterTags, p_search_term => :searchTerm, p_speakers => :speakers)))) lines";
	  connection.execute(   selectStatement   
		, [JSON.stringify(filterTags), searchTerm, JSON.stringify(speakers)], {
            outFormat: oracledb.OBJECT // Return the result as Object
        }, function (err, result) {
            if (err) {
			  console.log('Error in execution of select statement'+err.message);
              response.writeHead(500, {'Content-Type': 'application/json'});
              response.end(JSON.stringify({
                status: 500,
                    message: "Error getting the sessions",
                    detailed_message: err.message
               })
	          );  
            } else {
               response.writeHead(200, {'Content-Type': 'application/json'});
               // all rows in result consist of a property with a LINE object; all the line objects should be glued together to form a single string that can be JSON parsed
               var json='';
               for (var i=0;i< result.rows.length;i++) {
                   json=json + result.rows[i].LINE;
               }// for
               var sessions = JSON.parse(json);
               response.end(JSON.stringify(sessions));
              }
			doRelease(connection);
          }
	  );

	});
} //handleAllSessions

function handleRelatedSessions (request, response, sessionId) {
        console.log('related sessions for one session: '+sessionId);
    handleDatabaseOperation( request, response, function (request, response, connection) {

	  var selectStatement = "select lines.column_value line from   table( bth_sessions_api.get_related_json_str_tbl( p_session_id => :sessionId)) lines";
	  connection.execute(   selectStatement   
		, [sessionId], {
            outFormat: oracledb.OBJECT // Return the result as Object
        }, function (err, result) {
            if (err) {
			  console.log('Error in execution of select statement'+err.message);
              response.writeHead(500, {'Content-Type': 'application/json'});
              response.end(JSON.stringify({
                status: 500,
                    message: "Error getting the sessions",
                    detailed_message: err.message
               })
	          );  
            } else {
               response.writeHead(200, {'Content-Type': 'application/json'});
               // all rows in result consist of a property with a LINE object; all the line objects should be glued together to form a single string that can be JSON parsed
               var json='';
               for (var i=0;i< result.rows.length;i++) {
                   json=json + result.rows[i].LINE;
               }// for
               var session = JSON.parse(json);
               response.end(JSON.stringify(session));
              }
			doRelease(connection);
          }
	  );

	});
} //handleRelatedSessions

function handleSession(request, response, sessionId) {
        console.log('one session: '+sessionId);
    handleDatabaseOperation( request, response, function (request, response, connection) {

	  var selectStatement = "select lines.column_value line from   table( bth_sessions_api.get_ssn_details_json_str_tbl( p_session_id => :sessionId)) lines";
	  connection.execute(   selectStatement   
		, [sessionId], {
            outFormat: oracledb.OBJECT // Return the result as Object
        }, function (err, result) {
            if (err) {
			  console.log('Error in execution of select statement'+err.message);
              response.writeHead(500, {'Content-Type': 'application/json'});
              response.end(JSON.stringify({
                status: 500,
                    message: "Error getting the sessions",
                    detailed_message: err.message
               })
	          );  
            } else {
               response.writeHead(200, {'Content-Type': 'application/json'});
               // all rows in result consist of a property with a LINE object; all the line objects should be glued together to form a single string that can be JSON parsed
               var json='';
               for (var i=0;i< result.rows.length;i++) {
                   json=json + result.rows[i].LINE;
               }// for
               var session = JSON.parse(json);
               response.end(JSON.stringify(session));
              }
			doRelease(connection);
          }
	  );

	});
} //handleSession



function handleAll(request, response) {    
    console.log('all - with call to getAll');
    getAll(request, response, function (err, bthJson) {         
           if (err) {
			  console.log('Error in execution of select statement'+err.message);
              response.writeHead(500, {'Content-Type': 'application/json'});
              response.end(JSON.stringify({
                status: 500,
                    message: "Error getting the sessions",
                    detailed_message: err.message
               })
	          );  
            } else {
               response.writeHead(200, {'Content-Type': 'application/json'});
               response.end(JSON.stringify(bthJson));
              }
          }
	  );
} //handleAll

function handleAll2(request, response) {
    
    console.log('all ');
    handleDatabaseOperation( request, response, function (request, response, connection) {
	  var selectStatement = "select lines.column_value line from   table(bth_util.clob_to_string_tbl_t(bth_summary_api.json_summary)) lines";
	  connection.execute(   selectStatement   
		, [], { "outFormat": oracledb.OBJECT 
              , "maxRows": 500  
        }, function (err, result) {
            if (err) {
			  console.log('Error in execution of select statement'+err.message);
              response.writeHead(500, {'Content-Type': 'application/json'});
              response.end(JSON.stringify({
                status: 500,
                    message: "Error getting the sessions",
                    detailed_message: err.message
               })
	          );  
            } else {
               response.writeHead(200, {'Content-Type': 'application/json'});
               // all rows in result consist of a property with a LINE object; all the line objects should be glued together to form a single string that can be JSON parsed
              console.log('The number of result rows:'+result.rows.length);
               var json='';
               for (var i=0;i< result.rows.length;i++) {
                   json=json + result.rows[i].LINE;
               }// for
               var sessions = JSON.parse(json);
               response.end(JSON.stringify(sessions));
              }
			doRelease(connection);
          }
	  );

	});
} //handleAll2


function getAll( request, response, callback) {
    handleDatabaseOperation( request, response, function (request, response, connection) {
	  var selectStatement = "select lines.column_value line from   table(bth_util.clob_to_string_tbl_t(bth_summary_api.json_summary)) lines";
	  connection.execute(   selectStatement   
		, [], { "outFormat": oracledb.OBJECT 
              , "maxRows": 500  
        }, function (err, result) {
            if (err) {
			  console.log('Error in execution of select statement'+err.message);
              callback(err, null);
            } else {
              console.log('The number of result rows:'+result.rows.length);
               var json='';
               for (var i=0;i< result.rows.length;i++) {
                   json=json + result.rows[i].LINE;
               }// for
               var sessions = JSON.parse(json);
               callback(null, sessions);
            }// else
			doRelease(connection);
          }
	  );
    })
}

function handleAllSpeakers(request, response) {
    var searchTerm=     request.query.search;
        console.log('all speakers - for searchTerm '+searchTerm);
    handleDatabaseOperation( request, response, function (request, response, connection) {
//	  var departmentName = request.query.name ||'%';

	  var selectStatement = "select lines.column_value line from   table( bth_speakers_api.get_speakers_json_string_tbl( p_tags => null, p_search_term => :searchTerm)) lines";
	  connection.execute(   selectStatement   
		, [searchTerm], {
            outFormat: oracledb.OBJECT // Return the result as Object
        }, function (err, result) {
            if (err) {
			  console.log('Error in execution of select statement'+err.message);
              response.writeHead(500, {'Content-Type': 'application/json'});
              response.end(JSON.stringify({
                status: 500,
                    message: "Error getting the speakers",
                    detailed_message: err.message
               })
	          );  
            } else {
               response.writeHead(200, {'Content-Type': 'application/json'});
               // all rows in result consist of a property with a LINE object; all the line objects should be glued together to form a single string that can be JSON parsed
               var json='';
               for (var i=0;i< result.rows.length;i++) {
                   json=json + result.rows[i].LINE;
               }// for
console.log(json);
               var speakers = JSON.parse(json);
               response.end(JSON.stringify(speakers));
              }
			doRelease(connection);
          }
	  );

	});
} //handleAllSpeakers

function handleSpeaker(request, response, speakerId) {
        console.log('one speaker: '+speakerId);
    handleDatabaseOperation( request, response, function (request, response, connection) {

	  var selectStatement = "select lines.column_value line from   table( bth_speakers_api.get_skr_details_json_str_tbl( p_speaker_id => :speakerId)) lines";
	  connection.execute(   selectStatement   
		, [speakerId], {
            outFormat: oracledb.OBJECT // Return the result as Object
        }, function (err, result) {
            if (err) {
			  console.log('Error in execution of select statement'+err.message);
              response.writeHead(500, {'Content-Type': 'application/json'});
              response.end(JSON.stringify({
                status: 500,
                    message: "Error getting the sessions",
                    detailed_message: err.message
               })
	          );  
            } else {
               response.writeHead(200, {'Content-Type': 'application/json'});
               // all rows in result consist of a property with a LINE object; all the line objects should be glued together to form a single string that can be JSON parsed
               var json='';
               for (var i=0;i< result.rows.length;i++) {
                   json=json + result.rows[i].LINE;
               }// for
               var session = JSON.parse(json);
               response.end(JSON.stringify(session));
              }
			doRelease(connection);
          }
	  );

	});
} //handleSpeaker

function handleAllTags(request, response, filterTags, tagCategories, searchTerm) {
   
    console.log('all tags , for search term '+searchTerm+ '  and filterTags '+ JSON.stringify(filterTags));
    handleDatabaseOperation( request, response, function (request, response, connection) {

	  var selectStatement = "select lines.column_value line from   table( bth_tags_api.get_tags_json_string_tbl(p_filter_tags_json => :filterTags, p_search_term => :searchTerm)) lines";
	  connection.execute(   selectStatement   
		, [JSON.stringify(filterTags), searchTerm], {
            outFormat: oracledb.OBJECT // Return the result as Object
        }, function (err, result) {
            if (err) {
			  console.log('Error in execution of select statement'+err.message);
              response.writeHead(500, {'Content-Type': 'application/json'});
              response.end(JSON.stringify({
                status: 500,
                    message: "Error getting the sessions",
                    detailed_message: err.message
               })
	          );  
            } else {
               response.writeHead(200, {'Content-Type': 'application/json'});
               // all rows in result consist of a property with a LINE object; all the line objects should be glued together to form a single string that can be JSON parsed
               var json='';
               for (var i=0;i< result.rows.length;i++) {
                   json=json + result.rows[i].LINE;
               }// for
               var tags = JSON.parse(json);
               response.end(JSON.stringify(tags));
              }
			doRelease(connection);
          }
	  );

	});
} //handleAllTags


function handleTagsPost(req, res) {
    // interpret post 
    // { "tagCategories" : ["content","duration"], "filterTags" : ["SQL"] }
    console.log("handle tags post for : ");
    console.log(JSON.stringify(req.body));
	 
    handleAllTags(req, res, req.body.filterTags, req.body.tagCategories, req.body.searchTerm);
    
}

function handleAllSessionsCLOB(request, response) {
        console.log('all sessions');
           
    handleDatabaseOperation( request, response, function (request, response, connection) {
      var bindvars = { sessions_tbl_json_clob: { dir: oracledb.BIND_OUT, type: oracledb.CLOB } };	
	  var plsqlStatement = "begin :sessions_tbl_json_clob:= bth_sessions_api.get_sessions_json( p_tags => null, p_search_term => null, p_speakers => null); end;";
      console.log('do plsqlstatement '+plsqlStatement);
	  connection.execute(   plsqlStatement , bindvars,  function (err, result) {
         if(err) 
         { console.error(err.message);
           doRelease(connection); 
         }
         else {
           var lob = result.outBinds.sessions_tbl_json_clob;
           var clob_string = '';
           lob.setEncoding('utf8');
           lob.on('data', function(chunk) { console.log('next chunk received, '+chunk.length ); clob_string += chunk; console.log('chunk: '+chunk);});
           lob.on('end',
                function()
                {
                  console.log("lob.on 'end' event");
                  console.log("clob size is " + clob_string.length);
		       response.writeHead(200, {'Content-Type': 'text/html'});
               response.end('length of clob is '+clob_string.length);
               console.log(' ended response');
		     doRelease(connection);
                });
           lob.on('close', function(err) {
             console.log('on close - done - go write response' );
             if(err) { 
		       console.error('error in on close '+err.message); 
		       response.writeHead(500, {'Content-Type': 'application/json'});
               response.end(JSON.stringify({
                  status: 500,
                  message: "Error getting the sessions",
                  detailed_message: err.message
                 })
	           );  
		     } 
		     else {
//  		       var sessions  = JSON.parse(clob_string).sessions;
//		       console.log('1st session title '+ sessions[1].title);
//		       response.writeHead(200, {'Content-Type': 'application/json'});
  //             response.end(JSON.stringify(sessions));
  console.log("close event " );
		       response.writeHead(200, {'Content-Type': 'text/html'});
               response.end("clob_string "+ clob_string.length);
               console.log(' ended response');
		     }
		     doRelease(connection);
         });//close
         lob.on('error', function(err) {
           console.log('error event: ' + err);
              response.writeHead(500, {'Content-Type': 'application/json'});
              response.end(JSON.stringify({
                status: 500,
                    message: "Error getting the sessions",
                    detailed_message: err.message
               })
	          );  
           // connection.release(function(err) { console.error(err.message); return; } );
		   doRelease(connection);
         }); //error
         }//else (no err in execute)
      }); // execute	
	}); // handleDatabaseOperation
} //handleAllSessionsCLOB


function handleDatabaseOperation( request, response, callback) {
 //connectString : process.env.NODE_ORACLEDB_CONNECTIONSTRING || "140.86.4.91:1521/demos.lucasjellema.oraclecloud.internal",
 // var connectString = process.env.DBAAS_DEFAULT_CONNECT_DESCRIPTOR.replace("PDB1", "demos");
  var connectString = "140.86.4.91:1521/demos.lucasjellema.oraclecloud.internal";
  if  (process.env.DBAAS_DEFAULT_CONNECT_DESCRIPTOR) { connectString = process.env.DBAAS_DEFAULT_CONNECT_DESCRIPTOR.replace("PDB1", "demos");}
  console.log('ConnectString :' + connectString);
  oracledb.getConnection(
  {
    user          : process.env.DB_USER || "hr",
    password      : process.env.DB_PASSWORD || "hr",
    connectString : connectString
  },
  function(err, connection)
  {
    if (err) {
	  console.log('Error in acquiring connection ...');
	  console.log('Error message '+err.message);

      return;
    }        
    // do with the connection whatever was supposed to be done
	console.log('Connection acquired ; go execute - call callback ');
	callback(request, response, connection);
 });
}//handleDatabaseOperation


function doRelease(connection)
{
    console.log('relese db connection' );
  connection.release(
    function(err) {
      if (err) {
        console.error(err.message);
      }
    });
}
