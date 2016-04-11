var http = require('http');
var oracledb = require('oracledb');
var express = require('express');
var app = express();

var PORT = process.env.PORT || 8089;

app.listen(PORT, function () {
  console.log('Server running, Express is listening...');
});

app.get('/', function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write("No Data Requested, so none is returned");
    res.end();
});

app.get('/departments', function(req,res){ handleAllDepartments(req, res);} );

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

function doRelease(connection)
{
  connection.release(
    function(err) {
      if (err) {
        console.error(err.message);
      }
    });
}

function writeAllDepartments(request, response) {
    handleDatabaseOperation( request, response, function (request, response, connection) {
	  var departmentName = '%';

	  var selectStatement = "SELECT department_id, department_name FROM departments where department_name like :department_name";
	  connection.execute(   selectStatement   
		, [departmentName], {
            outFormat: oracledb.OBJECT // Return the result as Object
        }, function (err, result) {
            if (err) {
			  console.log('Error in execution of select statement'+err.message);
              console.log(JSON.stringify({
                status: 500,
                    message: "Error getting the departments",
                    detailed_message: err.message
               })
	          );  
            } else {
		       console.log('db response is ready '+JSON.stringify(result.rows));
              }
			doRelease(connection);
          }
	  );

	});
} //writeAllDepartments


function writeSessions(request, response) {
    handleDatabaseOperation( request, response, function (request, response, connection) {

	
	
	var plsqlStatement = "begin :sessions_tbl_json:= bth_sessions_api.get_sessions_json( p_tags => null, p_search_term => null, p_speakers => null); end;";
	  connection.execute(   plsqlStatement   
		, {  // bind variables
    sessions_tbl_json: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 32000 },
  },  function (err, result) {
            if (err) {
			  console.log('Error in execution of statement'+err.message);
              console.log(JSON.stringify({
                status: 500,
                    message: "Error getting the sessions",
                    detailed_message: err.message
               })
	          );  
            } else {
			console.log(sessions_tbl_json);
		       console.log('db response is ready '+JSON.stringify(sessions_tbl_json));
              }
			doRelease(connection);
          }
	  );

	});
} //



writeAllDepartments(null, null);
writeSessions(null, null);