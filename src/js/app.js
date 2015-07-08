var api = function(path) {
  return 'https://raw.avosapps.com/api/' + path;
};
var store = new Store();
store.init({
  db: 'code.insekai.com'
});
biuOpts.height = '44px';
biuOpts.lineHeight = '44px';
biuOpts.top = '-46px';
var editorLoaded = false;

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



function HomeRouter(page) {
  page = parseInt(page) || 1;
  var site_access_token = store.get('site_access_token');
  var github_access_token = store.get('github_access_token');
  console.log(store.get('userdata'))
  renderHeader({
    userdata: store.get('userdata')
  });
  loading();
  title('Code', true);
  qwest
    .get(api('latest'), {
      page: page
    })
    .then(function(data) {
      data = parseData(data);
      var homeHTML = render('list', {
        codes: data.codes
      });
      $('#output').html(homeHTML + '<div id="pagenavi"></div>');
      qwest
        .get(api('latest'), {
          page: page + 1
        })
        .then(function(data) {
          var hasPrev = data.codes.length > 0 ? true : false;
          var hasNext = true;
          if (page == 1) {
            hasNext = false;
          }
          var pagenavi = render('pagenavi', {
            prep: 'home',
            hasNext: hasNext,
            hasPrev: hasPrev,
            nextpage: page - 1,
            prevpage: page + 1
          });
          if (!hasNext && !hasPrev) {
            pagenavi = '';
          }
          $('#pagenavi').html(pagenavi);
        })
    })


};

function NewRouter(randomid) {
  renderHeader({
    userdata: store.get('userdata'),
    navTab: 'new'
  });
  loading();
  if (!editorLoaded) {
    $("<link/>", {
      rel: "stylesheet",
      type: "text/css",
      href: "/build/css/select2.min.css"
    }).appendTo("head");
    $.getScript('/build/js/select2.min.js', function() {
      console.log('done loaded external script');
    });
  }

  async.parallel({
      one: function(callback) {
        if (!editorLoaded) {
          $.getScript("http://cdn.staticfile.org/ace/1.1.3/ace.js", function() {

            callback(null, 1);
          })
        } else {
          callback(null, 1);
        }

      }
    },
    function(err, results) {


      var editorHTML = render('new', {
        randomid: randomid
      });
      $('#output').html(editorHTML);
      selectable();
      $('#indent').select2();
      var editor = ace.edit("editor");
      editor.setTheme("ace/theme/xcode");
      editor.getSession().setMode("ace/mode/text");
      editor.getSession().setUseSoftTabs(true);
      editor.getSession().setTabSize(2);
      editor.getSession().on('change', function(e) {
        //console.log(editor.getSession().getValue());
      });
      if (randomid) {
        qwest
          .get(api('code/' + randomid))
          .then(function(data) {
            var code = data.codes[0];
            $('#submit-public').data('code-id', code.objectId);
            $('#title').val(code.title);
            $('#description').val(code.description);
            $('#indent').val(code.indent).trigger("change");
            $('#languages').val(code.language).trigger("change");
            editor.getSession().setValue(code.content);
            var lang = convertlang(code.language);
            editor.getSession().setMode("ace/mode/" + lang);
            editor.getSession().setTabSize(code.indent);
          })
      } else {
        editor.getSession().setValue('');
      }

      editorLoaded = true;
      console.log('on event');
      $('body')
        .on('change', '#indent', function() {
          var size = $(this).val();
          editor.getSession().setTabSize(size);
        })
        .on('click', '#submit-public', function() {
          var el = $(this);
          var type = el.data('type');
          var code = {
            title: $('#title').val(),
            content: editor.getSession().getValue(),
            indent: $('#indent').val(),
            language: $('#languages').val(),
            description: $('#description').val()
          }
          console.log(code);
          if (!code.description || !code.content) {
            return biu('warning', 'You haven\'t finished the form!');
          }

          qwest
            .post(api('submit'), {
              code: code,
              user_id: store.get('user_id'),
              username: store.get('userdata').login,
              github_access_token: store.get('github_access_token'),
              type: type,
              code_id: el.data('code-id')
            })
            .then(function(data) {
              if (type == 'new') {
                biu('success', 'Successfully shared your code!')
              } else {
                biu('success', 'Successfully updated your code!')
              }
              Q.go('code/' + data.newCode.randomid);
            })
        })
        .on('change', '#languages', function() {
          var lang = $(this).val();
          lang = convertlang(lang)
          editor.getSession().setMode("ace/mode/" + lang);
          console.log(lang);

        })

    });

};

function convertlang(lang) {
  lang = lang.toLowerCase();
  switch (lang) {
    case 'c':
    case 'c++':
    case 'objective-c':
      lang = 'c_cpp';
      break;
    case 'c#':
      lang = 'csharp';
      break;
  }
  return lang;
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
    .then(function(userData) {
      $('#alert-text').append('<br>Successfully fetching userdata, processing...');
      store.set('userdata', userData);
      qwest
        .post(api('reg'), {
          userdata: {
            id: userData.id,
            username: userData.login,
            email: userData.email,
            avatar: userData.avatar_url,
            nickname: userData.name,
            github_access_token: github_access_token
          }
        })
        .then(function(doneReg) {
          var reginfo = '';
          switch (doneReg.type) {
            case 'reg':
              reginfo = 'You\'ve signed up, redirecting...';
              break;
            case 'login':
              reginfo = 'You\'ve logged in, redirecting...';
          }
          store.set('user_id', doneReg.user.objectId);
          $('#alert-text').append('<br>' + reginfo);
          setTimeout(function() {
            Q.go('home');
          }, 1000);
        })

    })
};

function ExitRouter() {
  if (confirm('Really want to sign out?')) {
    if (store.removeAll()) {
      Q.go('home');
    }
  }
};

function CodeRouter(randomid, action) {
  renderHeader({
    userdata: store.get('userdata')
  });
  loading();
  if (!action) {
    qwest
      .get(api('code/' + randomid))
      .then(function(data) {
        var pagetitle = data.codes[0].title || data.codes[0].description;
        title(pagetitle);
        data = parseData(data);
        var html = render('list', {
          codes: data.codes,
          codepage: true,
          current_user: store.get('user_id')
        });
        $('#output').html(html);
      })
  } else if (type == 'edit') {

  }

};

function UserRouter(username, action, page) {
  page = parseInt(page) || 1;
  action = action || 'codes';
  var userdata = store.get('userdata');
  loading();
  renderHeader({
    userdata: userdata,
    navTab: 'user'
  });
  $('#output').html(render('user'));
  qwest
    .get(api('user/' + username))
    .then(function(data) {
      data.user.userdata = userdata;
      data.user.my_id = store.get('user_id');
      data.user.tab = action;
      var userinfo = render('userinfo', data.user);
      $('#userinfo').html(userinfo);
    })
  if (action == 'folders') {
    qwest.get(api('folders'), {
      username: username
    })
    .then(function(data) {
      var html = render('folders', {
        folders: data.folders
      })
      $('#user-folders').html(html);
    })
  } else if (action == 'codes') {
    qwest
      .get(api('latest'), {
        page: page,
        user: username
      })
      .then(function(data) {
        for (var i = 0; i < data.codes.length; i++) {
          data.codes[i].line_number = lineNumber(data.codes[i].content);
          data.codes[i].timeago = moment(data.codes[i].createdAt).fromNow();
          data.codes[i].time = moment(data.codes[i].createdAt).format('dddd, MMMM Do YYYY, H:mm:ss a Z');
        }
        var HTML = render('list', {
          codes: data.codes
        });
        $('#user-codes').html(HTML + '<div id="pagenavi"></div>');
        qwest
          .get(api('latest'), {
            page: page + 1,
            user: username
          })
          .then(function(data) {
            var hasPrev = data.codes.length > 0 ? true : false;
            var hasNext = true;
            if (page == 1) {
              hasNext = false;
            }
            var pagenavi = render('pagenavi', {
              prep: 'user/' + action,
              hasNext: hasNext,
              hasPrev: hasPrev,
              nextpage: page - 1,
              prevpage: page + 1
            });
            if (!hasNext && !hasPrev) {
              pagenavi = '';
            }
            $('#pagenavi').html(pagenavi);
          })
      })
  }
};

$(function() {
  $('body')
    .on('click', '.close', function() {
      $(this).parent().slideUp();
    })
    .on('submit', '.search-form', function() {
      var form = $(this);
      var value = form.find('input').val();
      if (!value) {

      } else {
        Q.go('search/' + value);
      }
      return false;
    })
    .on('click', '#create-folder', function() {
      var folder = {
        name: $('#folder-name').val(),
        description: $('#folder-description').val()
      }
      if (!folder.name || !folder.description) {
        return biu('warning', 'You havn\'t finished the form!');
      }
      qwest.post(api('new_folder'), {
          folder: folder,
          user_id: store.get('user_id'),
          username: store.get('userdata').login,
          type: $(this).data('type')
        })
        .then(function(data) {
          console.log(data);
        })
    })


});

Q.reg('home', HomeRouter);
Q.reg('new', NewRouter);
Q.reg('signin', SigninRouter);
Q.reg('done', DoneRouter)
Q.reg('logout', ExitRouter);
Q.reg('code', CodeRouter);
Q.reg('user', UserRouter);
Q.reg('search', SearchRouter);
Q.reg('folders', FoldersRouter);

function FoldersRouter(id) {

  var userdata = store.get('userdata');
  renderHeader({
    userdata: userdata
  });
  if (id == 'new') {
    title('New folder');
    console.log('new folder');
    var html = render('new-folder');
    $('#output').html(html);
  }
}

function SearchRouter(q, page) {
  page = page || 1;
  renderHeader({
    userdata: store.get('userdata'),
    q: q
  });
  loading();
  qwest
    .get(api('search'), {
      q: q,
      page: page
    })
    .then(function(data) {
      data = parseData(data);
      var sid = data.sid;
      var HTML = render('list', {
        codes: data.codes,
        hits: data.hits,
        search_query: q
      });
      $('#output').html(HTML + '<div id="pagenavi"></div>');
      qwest
        .get(api('search'), {
          page: page + 1,
          q: q,
          sid: sid
        })
        .then(function(data) {
          var hasPrev = data.codes.length > 0 ? true : false;
          var hasNext = true;
          if (page == 1) {
            hasNext = false;
          }
          var pagenavi = render('pagenavi', {
            prep: 'search/' + q,
            hasNext: hasNext,
            hasPrev: hasPrev,
            nextpage: page - 1,
            prevpage: page + 1,
            sid: sid
          });
          if (!hasNext && !hasPrev) {
            pagenavi = '';
          }
          $('#pagenavi').html(pagenavi);
        })
    })
};

function renderHeader(data) {
  var header = render('header', data);
  $('#header').html(header);
  $('body')
    .off('change', '#indent')
    .off('click', '#submit-public')
    .off('change', '#languages')
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

function selectable() {
  $.getJSON('/build/json/langs.json', function(data) {
    $("#languages").select2({
      data: data
    });
  });
};

function lineNumber(text) {
  var text_lines_count = getCountLines(text);
  var lines = '';
  for (var n = 0; n < text_lines_count; n++) {
    var number = n + 1;
    lines += '<span class="line-number">' + number + '</span>';
  }
  var line_number = '<code class="hljs hljs-line-number">' + lines + '</code>';
  return line_number;
};

function getCountLines(text) {
  if (text.length === 0) return 0;

  var regExp = /\r\n|\r|\n/g;
  var lines = text.match(regExp);
  lines = lines ? lines.length : 0;

  if (!text[text.length - 1].match(regExp)) {
    lines += 1;
  }

  return lines;
}

Q.init({
  index: 'home'
});

function title(text, all) {
  if (all) {
    return $('title').html(text);
  }
  $('title').html(text + ' - ' + 'Code');
};

function deleteCode(code_obj_id) {
  if (confirm('Confirm the deleting action to code ' + code_obj_id + ' ?')) {
    qwest
      .post(api('code/delete'), {
        code_id: code_obj_id,
        user_id: store.get('user_id')
      })
      .then(function(data) {
        biu('success', 'Deleted!');
        Q.go('home');
      })
  }
};

function parseData(data) {
  for (var i = 0; i < data.codes.length; i++) {

    data.codes[i].timeago = moment(data.codes[i].createdAt).fromNow();
    data.codes[i].line_number = lineNumber(data.codes[i].content);
    data.codes[i].time = moment(data.codes[i].createdAt).format('dddd, MMMM Do YYYY, H:mm:ss a Z');
  }
  return data;
}
