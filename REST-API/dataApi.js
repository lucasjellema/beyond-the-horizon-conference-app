var http = require('http');
var fs = require('fs');
var oracledb = require('oracledb');
var express = require('express');
var app = express();

var PORT = process.env.PORT || 3000;
var APP_VERSION = '0.0.1.14';

app.listen(PORT, function () {
  console.log('Server running, version '+APP_VERSION+', Express is listening... at '+PORT+" for /departments and /sessions");
});

app.get('/', function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write("Version "+APP_VERSION+". No Data Requested, so none is returned; try /departments or /sessions or something else");
    res.end();
});

app.get('/departments', function(req,res){ handleAllDepartments(req, res);} );
app.get('/sessions', function(req,res){ handleAllSessions(req, res);} );
app.get('/speakers', function(req,res){ handleAllSpeakers(req, res);} );

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
        console.log('all sessions');
    handleDatabaseOperation( request, response, function (request, response, connection) {
//	  var departmentName = request.query.name ||'%';

	  var selectStatement = "select lines.column_value line from   table( bth_sessions_api.get_sessions_json_string_tbl( p_tags => null, p_search_term => null, p_speakers => null)) lines";
	  connection.execute(   selectStatement   
		, [], {
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



function handleAllSpeakers(request, response) {
        console.log('all speakers');
    handleDatabaseOperation( request, response, function (request, response, connection) {
//	  var departmentName = request.query.name ||'%';

	  var selectStatement = "select lines.column_value line from   table( bth_speakers_api.get_speakers_json_string_tbl( p_tags => null, p_search_term => null)) lines";
	  connection.execute(   selectStatement   
		, [], {
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
