
/*Http Server
https://replit.com/@MarioX/Vanila-Server-http-socket#http_server.js
modified version
*/
const { execSync } = require('child_process')
try {
  console.log(require.resolve("formidable"));
} catch (e) {
  console.log("Installing Dependency'formidable'");
  execSync("npm install formidable");
}

const http = require('http');
const formidable = require('formidable');
var path = require('path');
const fs = require('fs');

var server = null;
var Port = 8080;
var waitClose = false;

var realDir = '/';
//var serverdir = __dirname;
function clientdir() {
  return realDir;
}


var allowtransfer = {};
var allowupload = {};
var headers = {};
// IE8 does not allow domains to be specified, just the *
// headers["Access-Control-Allow-Origin"] = req.headers.origin;
headers["Access-Control-Allow-Origin"] = "*";
headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
headers["Access-Control-Allow-Credentials"] = false;
//eaders["Access-Control-Max-Age"] = '0'; // 24 hours
headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
headers["Cache-Control"] = 'no-store';
//headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
//headers["Pragma"] = "no-cache";
//headers["xpires"] = "0";

function movefile(oldPath, newPath) {
  fs.rename(oldPath, newPath, function(err) {
    if (err) {
      console.log('Error on moving "' + oldPath + '" to "' + newPath + '"');
      return;
    } //throw err
    console.log('File moved to: ' + newPath);
  })
}

function getUrlVariable(req, name) {
  var vars = [];
  var parts = [];
  var url = req.url;
  var urlfile = url.split('?');
  for (var i = 0; i < urlfile.length; i++) {
    parts.push(urlfile[i]);
  }
  for (var i = 0; i < parts.length; i++) {
    var findval = parts[i].split('&');
    for (var e = 0; e < findval.length; e++) {
      vars.push(findval[e]);
    }
  }
  for (var i = 0; i < vars.length; i++) {
    var preresp = vars[i].split('=');
    if (preresp.length == 2 && preresp[0] == name) {
      return preresp[1];
    }
  }
  return null;
}

function uploadfile(req, res, uploadDir, moveDir) {
  //const form = formidable({ multiples: true });
  var form = new formidable.IncomingForm();


  files = [],
    fields = [];
  form.uploadDir = uploadDir;

  form.on('field', function(field, value) {
    fields.push([field, value]);
  });

  form.on('file', function(field, file) {

    files.push([field, file]);
    var extension = path.extname(file.filepath + file.originalFilename);
    var filename = file.originalFilename.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    //console.log('UP1', file.originalFilename, file.size, file.mimetype, file.filepath, extension);


    try {
      if (
        //check if filename and extension is permited
        typeof (allowupload[extension]) != "undefined" &&
        file.mimetype === allowupload[extension].type
      ) {
        if (file.size < allowupload['CONFIG'].size) {
          //console.log('passou',allowupload[file.type]);
          var local = allowupload[extension].location;
          //var ext = extension;
          var call = allowupload[extension].call;
          //if (!fs.existsSync(local + filename)) {          
          movefile(file.filepath, local + filename);
          if (typeof (call) == 'function') call(file.filepath, local, filename, res);
                    /*} else {
                      res.writeHead(200, headers);
                      res.end('File already Exist');
                      console.log('File already Exist:' + filename);
                      console.log('on '+file.path);
                      fs.unlinkSync(file.path);
                    }*/} else {
          console.log('Upload Canceled, file is too Big');
          console.log(filename + ' - ' + file.mimetype);
          fs.unlinkSync(file.filepath);
          waitClose = false;
          //res.writeHead(404, headers);
          res.end();//invalid 
        }
      } else {
        console.log('Upload not Allowed');
        console.log(filename + ' - ' + file.mimetype);
        fs.unlinkSync(file.filepath);
        waitClose = false;
        //res.writeHead(404, headers);
        res.end();//invalid 
      }
    } catch (e) {
      console.log('Error Upload ' + e);
    }

  });


  form.parse(req, (err, fields, files) => {
    if (err) {
      console.log("form error", err, req.headers);
      return;
    }
    //console.log(req.headers);
    //execute .ons
    //console.log(JSON.stringify({ fields, files }, null, 2));
  });


}

function fileLoad(url, res, content, isServer) {
  var newdir = clientdir();
  //if (isServer == true) newdir = serverdir;
  var file = path.join(newdir, url);
  var filename = path.basename(file);
  var extension = path.extname(file);
  try {
    //locate on upload location for files missed
    if (!fs.existsSync(file) && typeof (allowupload[extension]) != "undefined") {
      if (fs.existsSync(allowupload[extension].location + '/' + filename)) {
        file = allowupload[extension].location + '/' + filename;
      }
    }
    //if(filename=='dummy.fbx')file=clientdir+'/dummy.fbx';
    var fileToLoad = fs.readFileSync(file);
    res.writeHead(200, { 'Content-Type': content });
    if (extension == ".html") {
      res.writeHead(200, headers);
    }
    res.end(fileToLoad);
    //console.log('Transfered:'+file);
  } catch (e) {
    console.log('\x1b[31m', 'File not found - ' + file);//red
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.write(
      "<div align='center'><h2><br><br>NOT FOUND - 404</h2><br>" +
      filename + "</div>");
    res.end();
  }
}

module.exports = {
  ServerDIR: function(cli) {
    realDir = cli;
  },
  //ServerDIR: serverdir,
  AllowTransfer: {
    add: function(extension, location, minetype, callback) {
      allowtransfer[extension] = { 'location': location, 'type': minetype, call: callback }
    },
    remove: function(extension) {
      delete (allowtransfer[extension]);
    },
    clear: function() {
      allowtransfer = {};
    }
  },
  AllowUpload: {
    config: function(tempDir, urlPost, size) {
      allowupload['CONFIG'] = { 'temp': tempDir, 'urlpost': urlPost, 'size': size };
    },
    passwordprotect: function(login, pass) {
      allowupload['PASSP'] = { 'login': login, 'pass': pass }; //null null = no passw
    },
    add: function(extension, location, minetype, callback) {
      allowupload[extension] = { 'location': location, 'type': minetype, 'call': callback }
    },
    remove: function(extension) {
      delete (allowupload[extension]);
    },
    onData: function(data, callback, administrator, passowrd) {
      if (typeof (allowupload['ONDATA']) == "undefined") allowupload['ONDATA'] = [];
      if (typeof (administrator) == 'undefined') administrator = null;
      if (typeof (passowrd) == 'undefined') passowrd = null;
      allowupload['ONDATA'].push
        ({ 'name': data, 'callback': callback, login: administrator, pass: passowrd });
    },
    clear: function() {
      allowupload = {};
    }
  },
  WaiToCLOSE: function(wait) {
    waitClose = wait;
  },
  START: function(REQUEST, port) {
    if (typeof (port) != 'undefined') { Port = port; }
    server = http.createServer(function(req, res) {
      res.writeHead(200, headers);



      //Default Response for File Uploads
      if (req.method === 'OPTIONS') {
        res.writeHead(200, headers);
        res.end();
      }
      var paa = path.extname(req.url);
      //Check for File Uploads

      if (typeof (allowupload['CONFIG']) != 'undefined' &&
        allowupload['CONFIG'].temp != null &&
        allowupload['CONFIG'].urlpost != null
      ) {
        if (req.method === 'POST' && req.url.startsWith(allowupload['CONFIG'].urlpost)) {
          try {
            var login = getUrlVariable(req, 'login');
            var pass = getUrlVariable(req, 'pass');
            if (typeof (allowupload['PASSP']) != 'undefined' &&
              allowupload['PASSP'].login != null &&
              allowupload['PASSP'].pass != null) {
              //passowrd protected              
              if (allowupload['PASSP'].login == login &&
                allowupload['PASSP'].pass == pass) { //Acept password                
                console.log('Upload with Login');
                waitClose = true;
                uploadfile(req, res, allowupload['CONFIG'].temp);//server/upload/
                return;
              } else { //password not acepted
                console.log('Wrong Login to Upload');
                waitClose = false;
                res.end();//invalid                                 
                return;
              }
            } else {
              console.log('Upload without Login');
              waitClose = true;
              uploadfile(req, res, allowupload['CONFIG'].temp);//server/upload/
              return;
            }

          } catch (e) {
            console.log('Error Upload ', e);
          }
        }
      }
      //Check for File Transfers       
      if (typeof (allowtransfer[paa]) != "undefined" && allowtransfer[paa] != null) {

        var deffile = allowtransfer[paa].location;
        if (deffile == null) deffile = decodeURI(req.url);
        fileLoad(deffile, res, allowtransfer[paa].type);
      } else {
        if (typeof (REQUEST) != 'undefined') {
          //deffile = decodeURI(req.url);
          //console.log(deffile.length);                 
          if (REQUEST(req, res) == 0) {
            return;
          }
          //res.writeHead(301, { Location: '/404.html' });        
          res.writeHead(404, headers); res.write(
            "<div align='center'><h2><br><br>NOT FOUND - 404</h2></div>");
          res.end();
        } else {
          //res.writeHead(301, { Location: '/404.html' });
          res.writeHead(404, headers); res.write(
            "<div align='center'><h2><br><br>NOT FOUND - 404</h2></div>");
          res.end();
        }
        if (waitClose == false) res.end();
      }
    }).listen(Port, function() {
      console.log('Http Created on Port: ' + Port);
    });
    return server;
  },
  LOADFILE: function(FILE, res, Type, isServer) {
    fileLoad(FILE, res, Type, isServer);
  },
  UPLOADFILE: function(req, res, uploadDir, moveDir) {
    uploadfile(req, res, uploadDir, moveDir);
  },
  HEADERS: headers
}


