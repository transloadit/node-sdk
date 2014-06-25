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
client.createTemplate(params, function(err, result) {
  if (err) {
    console.log('Failed creating template', err);
    return;
  }

  console.log('Template created successfully:', result);
  var newParams = {
    name     : 'node_sdk_test2',
    template : templateString
  };
  client.editTemplate(result.template_id, newParams, function(err, templateResult) {
    if (err) {
      console.log('failed editing template:', err);
      return;
    }

    console.log('Successfully edited template', templateResult);

    client.getTemplate(result.template_id, function(err, templateResult) {
      if (err) {
        console.log('failed fetching template:', err);
        return;
      }

      console.log('Successfully fetched template', templateResult);
    });
  });
});
