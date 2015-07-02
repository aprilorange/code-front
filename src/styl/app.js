var api = function(path) {
  return 'https://inshare.avosapps.com/api/' + path;
};
var store = new Store();
store.init({db: 'code.insekai.com'});

function render(tpl, data) {
  var html = $('#' + tpl + '-template').html();
  return nunjucks.renderString(html, data);
};

function loading() {
  var html = render('loading');
  $('#output').html(html);
};

function parseq() {
  // parse url queries to an object, http://example.com/?q=words&ord=desc => {q: 'words', ord: 'desc'}
  var query = location.search.substring('1').split('&')
  var params = {}
  for (var i in query) {
    var key = query[i].split('=')[0],
      value = query[i].split('=')[1]
    params[key] = value
  }
  return params;
};



function HomeRouter() {
  var site_access_token = store.get('site_access_token');
  var github_access_token = store.get('github_access_token');
  console.log(store.get('userdata'))
  renderHeader({
    userdata: store.get('userdata')
  });
};

function NewRouter() {
  loading();
  $.getScript("http://cdn.staticfile.org/ace/1.1.3/ace.js", function(){
    var editorHTML = render('new');
    $('#output').html(editorHTML);
    var editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/javascript");
 });
};

function SigninRouter() {
  location.href = api('auth');
};

function DoneRouter(github_access_token) {
  renderHeader();
  store.set('github_access_token', github_access_token);
  var div = addAlert('Initializing user data...');
  $('#output').append(div);
  qwest
    .get('https://api.github.com/user?access_token=' + github_access_token)
    .then(function(data) {
      $('#alert-text').append('<br>Successfully fetching userdata, redirecting...');
      store.set('userdata', data);
      setTimeout(function() {
        Q.go('home');
      }, 1000);
    })
};

$(function() {
  $('body')
    .on('click', '.close', function() {
      $(this).parent().slideUp();
    })
});

Q.reg('home', HomeRouter);
Q.reg('new', NewRouter);
Q.reg('signin', SigninRouter);
Q.reg('done', DoneRouter);

function renderHeader(data) {
    var header = render('header', data);
    $('#header').html(header);
};

function addAlert(text, type) {
  type = type || 'info';
  var div = '<div id="alert" class="alert alert-__TYPE__ alert-dismissible" role="alert">\
  <button type="button" class="close" data-dismiss="alert" aria-label="Close">\
  <span aria-hidden="true">&times;</span></button>\
  <span id="alert-text">__TEXT__</span>\
</div>'.replace(/__TEXT__/g, text).replace(/__TYPE__/g, type);
return div;
};

Q.init({
  index: 'home'
});
