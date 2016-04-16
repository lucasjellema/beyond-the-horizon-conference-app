var http = require('http');
var fs = require('fs');
var oracledb = require('oracledb');
var express = require('express');
var bodyParser = require('body-parser') // npm install body-parser
var app = express();

var PORT = process.env.PORT || 3000;
var APP_VERSION = '0.0.1.34';

app.listen(PORT, function () {
  console.log('Server running, version '+APP_VERSION+', Express is listening... at '+PORT+" for /departments and /sessions");
});
//app.use(bodyParser.urlencoded({  extended: true}));

app.get('/', function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write("Version "+APP_VERSION+". No Data Requested, so none is returned; try /departments or /sessions or something else");
    res.write("Supported URLs:");
    res.write("/sessions , /sessions?search=YourSearchTerm, /sessions/<sessionId>");
    res.write("/speakers , /speakers?search=YourSearchTerm, /speakers/<speakerId>"); 
    res.write("/tags , POST for tags with JSON body { 'tagCategories' : ['content','duration'] , 'filterTags' : ['SQL']} "); 
    res.end();
});

app.get('/departments', function(req,res){ handleAllDepartments(req, res);} );
app.get('/sessions', function(req,res){ handleAllSessions(req, res);} );
app.get('/sessions/:sessionId', function(req,res){
    var sessionId = req.params.sessionId;
    handleSession(req, res, sessionId);
}); 

app.get('/speakers', function(req,res){ handleAllSpeakers(req, res);} );
app.get('/speakers/:speakerId', function(req,res){
    var speakerId = req.params.speakerId;
    handleSpeaker(req, res, speakerId);
}); 

app.get('/tags', function(req,res){ 
     handleAllTags(req, res,"['SOA']",null,req.query.search);
    } );
//function handleAllTags(request, response, filterTags, tagCategories, searchTerm) {

app.use(bodyParser())
   .post('/tags', function(req,res){
       console.log("handle post tags ");
       console.log("body parser: "+bodyParser); 
       console.log("content type: "+req.get('content-type')); 
       console.log("url: "+req.url); 
       console.log("body is "+JSON.stringify(req.body));     
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


function handleAllSessions(request, response) {
    var searchTerm=     request.query.search;
    console.log('all sessions , for search term '+searchTerm);
    handleDatabaseOperation( request, response, function (request, response, connection) {
//	  var departmentName = request.query.name ||'%';

	  var selectStatement = "select lines.column_value line from   table(bth_util.clob_to_string_tbl_t(bth_sessions_api.json_session_tbl_summary( p_sessions=>  bth_sessions_api.get_sessions( p_tags => null, p_search_term => :searchTerm, p_speakers => null)))) lines";
	  connection.execute(   selectStatement   
		, [searchTerm], {
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
