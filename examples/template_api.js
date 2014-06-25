var TransloaditClient = require("../lib/TransloaditClient");

var client = new TransloaditClient({
  authKey    : 'YOUR_AUTH_KEY',
  authSecret : 'YOUR_AUTH_SECRET'
});

var template = {
  steps: {
    encode: {
      use: ":original",
      robot: "/video/encode",
      preset: "ipad-high"
    },
    thumbnail: {
      use: "encode",
      robot: "/video/thumbnails"
    }
  }
};

var templateString = JSON.stringify(template);
var params = {
  name     : 'node_sdk_test1',
  template : templateString
};
var newParams = {
  name     : 'node_sdk_test2',
  template : templateString
};

client.createTemplate(params, function(err, result) {
  if (err) {
    return console.log('Failed creating template', err);
  }
  console.log('Template created successfully:', result);

  client.editTemplate(result.template_id, newParams, function(err, editResult) {
    if (err) {
      return console.log('failed editing template:', err);
    }
    console.log('Successfully edited template', editResult);

    client.getTemplate(result.template_id, function(err, templateResult) {
      if (err) {
        return console.log('failed fetching template:', err);
      }
      console.log('Successfully fetched template', templateResult);

      client.deleteTemplate(result.template_id, function(err, delResult) {
        if (err) {
          return console.log('failed deleting template:', err);
        }
        console.log('Successfully deleted template', delResult);
      });
    });
  });
});
