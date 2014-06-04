var TransloaditClient = require("./lib/TransloaditClient");

var client = new TransloaditClient({
  authKey: '7v0245c7401f453b99040492490144aa',
  authSecret: 'b963d3d2f92e410460da332bc3e8d3f89f12723d'
});

var opts = {
  params: {
    template_id: '74223ab6afdbaee8fa955a937cbc97ff',
    blocking: true,
    steps: {
      image: {
        width: 51,
        height: 50
      }
    }
  }
};

var filePath = "/Applications/XAMPP/xamppfiles/htdocs/transloadit/api2/";
filePath += "api2/test/fixture/file/smilie.gif";

client.addFile("foo.mp3", filePath);
client.createAssembly(opts, function(err, result) {
  if (err) {
    console.log('fail', err);
  } else {
    console.log('success');
  }

  var assemblyId = result.assembly_id;
  console.log(assemblyId);
  console.log(result.results.image[0].url);

  // client.assemblyStatus(assemblyId, function(err, result) {
  //   console.log(err, result);
  // });

  // client.replayAssemblyNotification(assemblyId, function(err) {
  //   console.log('notification replayed', err);

  //   client.deleteAssembly(assemblyId, function(err) {
  //     console.log('deleted', err);
  //   });
  // });
});
