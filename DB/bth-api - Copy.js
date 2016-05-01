var http = require('http');
var fs = require('fs');
var oracledb = require('oracledb');
var express = require('express');
var app = express();

var PORT = process.env.PORT || 3000;

app.listen(PORT, function () {
  console.log('Server running, Express is listening... at '+PORT);
});

app.get('/', function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write("No Data Requested, so none is returned");
    res.end();
});

app.get('/departments', function(req,res){ handleAllDepartments(req, res);} );
app.get('/sessions', function(req,res){ handleSessions(req, res);} );

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
	console.log('Connection acquired ; go execute ');
	callback(request, response, connection);
 });
}//handleDatabaseOperation

function handleAllDepartments(request, response) {
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
    handleDatabaseOperation( request, response, function (request, response, connection) {
      var bindvars = { sessions_tbl_json_clob: { dir: oracledb.BIND_OUT, type: oracledb.CLOB } };	
	  var plsqlStatement = "begin :sessions_tbl_json_clob:= bth_sessions_api.get_sessions_json( p_tags => null, p_search_term => null, p_speakers => null); end;";
	  connection.execute(   plsqlStatement , bindvars,  function (err, result) {
         if(err) { console.error(err.message);doRelease(connection); return; }
         var lob = result.outBinds.sessions_tbl_json_clob;
         var clob_string = '';
         lob.setEncoding('utf8');
         lob.on('data', function(chunk) { clob_string += chunk; });
         lob.on('close', function(err) {
           if(err) { 
		     console.error(err.message); 
		     response.writeHead(500, {'Content-Type': 'application/json'});
             response.end(JSON.stringify({
                status: 500,
                message: "Error getting the sessions",
                detailed_message: err.message
               })
	         );  
		   } 
		   else {
  		     var sessions  = JSON.parse(clob_string).sessions;
		     console.log('1st session title '+ sessions[1].title);
		     response.writeHead(200, {'Content-Type': 'application/json'});
             response.end(JSON.stringify(sessions));
		   }
		   doRelease(connection);
         });
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
         });
      }); // execute	
	}); // handleDatabaseOperation
} //handleAllSessions


function doRelease(connection)
{
  connection.release(
    function(err) {
      if (err) {
        console.error(err.message);
      }
    });
}
