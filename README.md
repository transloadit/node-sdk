transloadit
===========

A transloadit client library that runs callbacks when they're done

quick example
-------------
```javascript
var Transloadit = require('transloadit')
  , fs = require('fs')
  , config = require('config')
  , transloadit
  ;
  
// initialize our client!
transloadit = new Transloadit({
  key: config.transloadit.key,
  secret: config.transloadit.secret
});

// let's stream an image to transloadit
imageStream = fs.createReadStream('/path/to/file');
mimeType = 'image/png';   
fieldName = 'image';      // multipart/form-data field for this data
fileName = 'test.png';    // filename reported to multipart/form-data

transloadit.createAssembly()
  .stream(fieldName, fileName, mimeType, imageStream) // add a stream to this assembly request (multiple can be sent)
  .templateId('1234')  // specify a template id to use
  .step('export', '/s3/store', {  // alter the export step of our template
    bucket: config.s3.bucket
  })
  .step('resize_to_75', '/image/resize', { // add a new step to our template
    width: 75,
    height: 75,
    use: ':original'
  })
  .error(onError) // triggers when there is a terminal error with this assembly
  .success(onSuccess) // triggers when the assembly completes successfully
  .update(onUpdate) // triggers each time we update the current status of the assembly (via polling)
  .complete(onComplete); // triggers always at the end of an assemby (whether it failed or succeeded)
```