var http = require('http');
var fs = require('fs');
var oracledb = require('oracledb');
var express = require('express');
var bodyParser = require('body-parser') // npm install body-parser
var json2csv = require('json2csv'); /* https://www.npmjs.com/package/json2csv , http://stackoverflow.com/questions/30292930/how-can-i-cause-a-newly-created-csv-file-to-be-downloaded-to-the-user, http://stackoverflow.com/questions/17450412/how-to-create-an-excel-file-with-nodejs, https://www.npmjs.com/package/json2csv   */
var app = express();

var PORT = process.env.PORT || 3000;
var APP_VERSION = '0.0.1.60';

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
               // all rows in result consist of a property with a LINE object; all the line objects should be glued together to form a single string that can be JSON parsed
               console.log('The number of result rows:'+result.rows.length);
               var json='';
               for (var i=0;i< result.rows.length;i++) {                   
                   json=json + result.rows[i].LINE;               
                }// for
               var bthJson = JSON.parse(json);
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
                   response.set({
                     'Content-Disposition': 'attachment; filename=bth-speakers.xls',
                     'Content-Type': 'text/csv'
                   });
                   response.send(csv);
                  }  
               });//json2csv
              }//else 
			doRelease(connection);
          }// callback connection.execute
	  );//connection.execute
    });//handleDatabaseOperation
}// generateAppSpeakers



function generateAppSessions(request, response) {
    console.log("produce app data - sessions  ");
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
               // all rows in result consist of a property with a LINE object; all the line objects should be glued together to form a single string that can be JSON parsed
               console.log('The number of result rows:'+result.rows.length);
               var json='';
               for (var i=0;i< result.rows.length;i++) {                   
                   json=json + result.rows[i].LINE;               
                }// for
               var bthJson = JSON.parse(json);
               //var fieldNames = ['ID','tags'            , 'title','scheduleItemStartDateTime', 'scheduleItemEndDateTime','location-name'  ,'description','Is session','sessions','speakers'           ,'organization','image','Rating'];  
               //var fields     = ['sessionId', 'tags','title', 'planning.slotDate'    ,'planning.slotStartTime'          , 'planning.room' ,'abstract'   ,'TRUE'     ,'X'         ,'speakers.id'       ,'X'           ,'X'   ,'X'    ,'X'     ];
// documentation: https://www.npmjs.com/package/json2csv               
               var fields=  [
    {
      label: 'ID', // (optional, column will be labeled 'path.to.something' if not defined) 
      value: 'sessionId', // data.path.to.something 
      default: 'NULL' // default if value is not found (optional, overrides `defaultValue` for column) 
    },
    {
      label: 'tags', // (optional, column will be labeled 'path.to.something' if not defined) 
      value: 'X', // data.path.to.something 
      default: 'NULL' // default if value is not found (optional, overrides `defaultValue` for column) 
    },
    {
      label: 'title', // (optional, column will be labeled 'path.to.something' if not defined) 
      value: 'title', // data.path.to.something 
      default: 'NULL' // default if value is not found (optional, overrides `defaultValue` for column) 
    },
    {
      label: 'scheduleItemStartDateTime', 
      value: function(row) {
          if (row.planning) {
        return row.planning.slotDate + ' '+  row.planning.slotStartTime;
          } else return ;
      },
      default: 'NULL' // default if value fn returns falsy 
    } 
    , {
      label: 'scheduleItemEndDateTime', 
      value: function(row) {
          if (row.planning) {
        return row.planning.slotDate + ' '+ row.planning.slotEndTime;
          } else return ;
      },
      default: 'NULL' // default if value fn returns falsy 
    } 
    , {
      label: 'location-name', 
      value: function(row) {
          if (row.planning) {
        return row.planning.room;
          } else return ;
      },
      default: 'NULL' // default if value fn returns falsy 
    } 
    , {
      label: 'description', 
      value: 'abstract',
      default: 'NULL' // default if value fn returns falsy 
    } 
    , {
      label: 'Is Session', 
      value: 'X',
      default: 'TRUE' // default if value fn returns falsy 
    } 
    , {
      label: 'sessions', 
      value: 'X',
      default: 'null' // default if value fn returns falsy 
    } 
    , {
      label: 'speakers', // comma separated list of id's for all speakers associated with this session
      value: function(row) {
          if (row.speakers) {
        return row.speakers[0].id ;// TODO: csv list for all speakers
          } else return ;
      },
      default: 'NULL' // default if value fn returns falsy 
    } 
  ];
               
               
               
               json2csv({ data:  bthJson.sessions, fields: fields, del: '\t'  }, function(err, csv) {
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
                     'Content-Disposition': 'attachment; filename=bth-sessions.xls',
                     'Content-Type': 'text/csv'
                   });
                   response.send(csv);
                  }  
               });//json2csv
              }//else 
			doRelease(connection);
          }// callback connection.execute
	  );//connection.execute
    });//handleDatabaseOperation
}// generateAppSessions


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
} //handleAll


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
