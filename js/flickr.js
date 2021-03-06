var flickrKey = "ff97f4120c66e9295f2c4189b783e5ab";
var format = "json";
var rootURL = "https://api.flickr.com/services/rest/?";

var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

var sortable;

$(document).ready(function() {
  updateClock()
  setInterval(updateClock, 1000);

  chrome.storage.sync.get("storedFormattedLinks", function(links) {
    if (links["storedFormattedLinks"] != null) {
      loadCustomLinks(links["storedFormattedLinks"]);
    } else {
      loadDefaultLinks();
    }
  });

  chrome.storage.sync.get("flickrUserNSID", function(data) {
    if (data["flickrUserNSID"] != null) {
      updateBackgroundPhoto(data["flickrUserNSID"]);
    } else {
      getIDForUsername("thepianistalex");
    }
  });

  $("#save-settings").click(function(e) {
    e.stopImmediatePropagation();
    saveLinks();
    getIDForUsername($("#flickr-username-input").val());
    $(".settings-body").css("display", "none");
  });

  $("#add-heading").click(function(e) {
    e.stopImmediatePropagation();
    addHeadingSettingsLink();
  });

  $("#add-link").click(function(e) {
    e.stopImmediatePropagation();
    addLinkSettingsLink();
  });
});

function loadDefaultLinks() {
  var defaultLinks = [
    {
      "type": "header",
      "name": "Quick Links"  
    },
    {
      "type": "link",
      "name": "Google",
      "url": "https://google.com"
    },
    {
      "type": "link",
      "name": "Mail",
      "url": "https://gmail.com"
    },
    {
      "type": "link",
      "name": "Maps",
      "url": "https://maps.google.com"
    },
    {
      "type": "link",
      "name": "Calendar",
      "url": "https://calendar.google.com"
    },
    {
      "type": "link",
      "name": "Drive",
      "url": "https://drive.google.com"
    },
    {
      "type": "header",
      "name": "Work"
    },
    {
      "type": "link",
      "name": "GitHub",
      "url": "https://github.com"
    },
    {
      "type": "link",
      "name": "Coursera",
      "url": "https://coursera.org"
    },
    {
      "type": "header",
      "name": "Other"
    },
    {
      "type": "link",
      "name": "Messenger",
      "url": "https://messenger.com"
    },
    {
      "type": "link",
      "name": "Flickr",
      "url": "https://flickr.com"
    }
  ];

  loadCustomLinks(defaultLinks);
}

function loadCustomLinks(links) {
  $(".pure-menu-list").text("");
  for (var i = 0; i < links.length; i++) {
    var link = links[i];
    var html = createLinkHTML(link);
    
    $(".pure-menu-list").append(html);
  }

  var settings = '<li class="pure-menu-item"><a href="#"" class="pure-menu-link" id="settings-nav">Settings</a></li>'
  $(".pure-menu-list").append(settings)

  $("#settings-nav").click(function(e) {
    e.stopImmediatePropagation();
    $(".settings-body").css("display", "block");
    chrome.storage.sync.get("flickrUsername", function(data) {
      $("#flickr-username-input").val(data["flickrUsername"]);
    });

    var links = processCurrentLinks();
    setupSettingsLinks(links);
  });
}

function createLinkHTML(link) {
  if (link.type == "header") {
    return '<li class="pure-menu-heading">' + link.name + '</li>'
  } else {
    return '<li class="pure-menu-item"><a href="' + link.url + '" class="pure-menu-link">' + link.name + '</a></li>'
  }
}

function getIDForUsername(username) {
  var usernameKey = "username~" + username
  
  chrome.storage.local.get(usernameKey, function(data) {
    if (data[usernameKey] != null) {
      updateBackgroundPhoto(data[usernameKey]);
      chrome.storage.sync.set({
        "flickrUsername": username,
        "flickrUserNSID": data[usernameKey]
      });
    } else {
      var method = "flickr.people.findByUsername";
      var url = getURLForAPI(method);
      url += "&username=" + username;
      
      $.getJSON(url).done(function(data) {
        var userNSID = data["user"]["nsid"];
        var localUsernameStoredObject = {};
        localUsernameStoredObject[usernameKey] = userNSID;

        chrome.storage.local.set(localUsernameStoredObject)
        chrome.storage.sync.set({
          "flickrUsername": username,
          "flickrUserNSID": userNSID
        }, function() {
          updateBackgroundPhoto(userNSID);
        });
      });
    }
  });
}

function updateBackgroundPhoto(nsid) {
  var photosKey = "photos~" + nsid;
  var currentTime = new Date().getTime() / 1000;
  var twoDays = 2 * 24 * 60 * 60;

  chrome.storage.local.get(photosKey, function(data) {
    if (data[photosKey] != null && data[photosKey]["setAt"] + twoDays > currentTime) {
      var photoArray = data[photosKey]["photoArray"];
      setPhoto(photoArray);
    } else {
      var method = "flickr.people.getPublicPhotos";
      var url = getURLForAPI(method);

      url += "&user_id=" + nsid;
      url += "&per_page=92&extras=url_h,url_o,geo,owner_name";

      $.getJSON(url).done(function(flickrData) {
        var photoArray = flickrData["photos"]["photo"];
        setPhoto(photoArray);

        var localPhotosStoredObject = {};
        var photosInformation = {};

        photosInformation["photoArray"] = photoArray;
        photosInformation["setAt"] = currentTime;

        localPhotosStoredObject[photosKey] = photosInformation;

        chrome.storage.local.set(localPhotosStoredObject);
      });
    }
  });
}

function setPhoto(photoArray) {
  var retriesLeft = 32
  var photo = photoArray[0]
  while(true) {
    var arrayIndex = Math.floor(Math.random() * photoArray.length);
    photo = photoArray[arrayIndex];

    var windowWidth = $(window).width();
    var windowHeight = $(window).height();

    if (photo["url_h"] != null) {
      if ((parseInt(photo["width_h"]) <= parseInt(photo["height_h"])) == windowWidth <= windowHeight) {
        break;
      }
    } else {
      if ((parseInt(photo["width_o"]) <= parseInt(photo["height_o"])) == windowWidth <= windowHeight) {
        break;
      }
    }

    retriesLeft--;
    if (retriesLeft == 0) {
      break;
    }
  }

  if (photo["url_h"] != null) {
    fadeInBackground(photo["url_h"]);
  } else {
    fadeInBackground(photo["url_o"]);
  }
  updateAttribution(photo);
}

function fadeInBackground(photoURL) {
  $("#background-image").fadeOut(1000, function() {
    $("#background-image").remove();

    var img = new Image();
    img.style.display = "none";
    img.onload = function() {
      $(this).fadeIn(1000);
    };
    img.setAttribute("id", "background-image");
    $(".fade-in-image").append(img);
    img.src = photoURL
  });
}

function updateAttribution(photo) {
  var title = photo["title"]
  var owner = photo["ownername"];
  var ownerID = photo["owner"];
  var placeID = photo["place_id"];

  if (placeID == null) {
    $(".attribution").html("<p><a href='https://www.flickr.com/photos/" + ownerID + "/" + photo["id"] + "'>" + title + "</a> taken by <a href='https://www.flickr.com/" + ownerID + "'>" + owner + "</a></p>");
    return;
  }

  var placeIDKey = "placeID~" + placeID;
  chrome.storage.local.get(placeIDKey, function(data) {
    if (data[placeIDKey] != null) {
      var place = data[placeIDKey];
      $(".attribution").html("<p><a href='https://www.flickr.com/photos/" + ownerID + "/" + photo["id"] + "'>" + title + "</a> taken by <a href='https://www.flickr.com/" + ownerID + "'>" + owner + "</a></p><p><em>" + place + "</em></p>");
    } else {
      var method = "flickr.places.getInfo";
      var url = getURLForAPI(method);
      url += "&place_id=" + placeID;

      $.getJSON(url).done(function(data) {
        var place = data["place"].name;
        
        var localPlaceStoredObject = {};
        localPlaceStoredObject[placeIDKey] = place;

        chrome.storage.local.set(localPlaceStoredObject);

        $(".attribution").html("<p><a href='https://www.flickr.com/photos/" + ownerID + "/" + photo["id"] + "'>" + title + "</a> taken by <a href='https://www.flickr.com/" + ownerID + "'>" + owner + "</a></p><p><em>" + place + "</em></p>");
      });
    }
  })
}

function saveLinks() {
  var formattedLinks = [];
  var links = $("#link-items").children();

  for (var i = 0; i < links.length; i++) {
    var element = $(links[i]);
    var elementIDComponents = element.attr("id").split("-");
    var elementIndex = elementIDComponents[elementIDComponents.length - 1];

    var type = $(element.find(".settings-link-type")[0]).text();

    if (type == "Header") {
      var headerName = $(element.find("#settings-link-" + elementIndex)[0]).val();
      var formattedLink = {"type": "header", "name": headerName};
      formattedLinks[formattedLinks.length] = formattedLink
    } else {
      var linkName = $(element.find("#settings-link-" + elementIndex)[0]).val();
      var url = $(element.find("#settings-link-url-" + elementIndex)[0]).val();
      var formattedLink = {"type": "link", "name": linkName, "url": url};
      formattedLinks[formattedLinks.length] = formattedLink
    }
  }

  var storedFormattedLinks = {"storedFormattedLinks": formattedLinks}
  chrome.storage.sync.set(storedFormattedLinks);

  loadCustomLinks(formattedLinks);
}

function processCurrentLinks() {
  var linkElements = [];
  var links = $("#favorite-links").children();

  for (var i = 0; i < links.length; i++) {
    var formattedElement = {};
    var element = $(links[i]);
    if (element.attr("class") == "pure-menu-heading") {
      formattedElement["type"] = "heading";
      formattedElement["name"] = element.text();
    } else {
      formattedElement["type"] = "link";
      var innerLink = $(element.children("a")[0]);
      formattedElement["link"] = innerLink.attr("href");
      formattedElement["name"] = innerLink.text();
    }

    linkElements[linkElements.length] = formattedElement;
  }

  return linkElements;
}

function setupSettingsLinks(links) {
  $("#link-items").text("");
  for(var i = 0; i < links.length; i++) {
    var link = links[i];
    var linkType = "";
    var inputText = "";

    if (link.name == "Settings") {
      continue;
    }
    
    $("#link-items").append(createLinkField(link, i));
  }

  sortable = Sortable.create($("#link-items")[0], {
    animation: 150,
    filter: '.delete-link-link, input'
  });

  $(".delete-link-link").click(function(e) {
    e.stopImmediatePropagation();
    deleteLink($(this).parent());
  });
}

function generateLinkID() {
  return new Date().getTime();
}

function addHeadingSettingsLink() {
  var headingHTML = createLinkField({"type": "heading", "name": ""}, generateLinkID());
  $("#link-items").append(headingHTML);
}

function addLinkSettingsLink() {
  var linkHTML = createLinkField({"type": "link", "name": "", "link": ""}, generateLinkID());
  $("#link-items").append(linkHTML);
}

function deleteLink(linkElement) {
  var linkElements = linkElement.attr("id").split("-");
  var linkID = linkElements[linkElements.length - 1];

  $("#settings-list-item-" + linkID).remove();
}

function createLinkField(link, index) {
  var linkType = "";
  var inputText = "";

  if (link.type == "heading") {
      linkType = 'Header'
      inputText = '<div class="pure-u-3-4"><input id="settings-link-' + index + '" value="' + link.name + '" class="pure-u-1"></div>'
    } else {
      linkType = 'Link'
      inputText = '<div class="pure-u-1-3"><input id="settings-link-' + index + '" value="' + link.name + '" class="pure-u-23-24"></div> \
        <div class="pure-u-5-12"><input id="settings-link-url-' + index + '" value="' + link.link + '" class="pure-u-1"></div>'
    }

    var html = '<li class="settings-list-item" id="settings-list-item-' + index + '"> \
      <div class="pure-g"> \
        <div class="pure-u-1-6"><div class="settings-link-type pure-u-11-12">' + linkType + '</div></div> \
        ' + inputText + ' \
        <div id="settings-delete-' + index + '" class="delete-link pure-u-1-12"><a href="#" class="delete-link-link">X</a></div> \
      </div></li>';
    return html;
}

function getURLForAPI(method) {
  var params = ["format=" + format, "api_key=" + flickrKey, "method=" + method, "nojsoncallback=1"];
  return rootURL + params.join("&");
}

function updateClock() {
  var currentTime = new Date();
  var currentHours = currentTime.getHours();
  var currentMinutes = currentTime.getMinutes();
  var currentSeconds = currentTime.getSeconds();

  // Pad the minutes and seconds with leading zeros, if required
  currentMinutes = (currentMinutes < 10 ? "0" : "") + currentMinutes;
  currentSeconds = (currentSeconds < 10 ? "0" : "") + currentSeconds;

  // Compose the string for display
  var currentTimeString = currentHours + ":" + currentMinutes + ":" + currentSeconds;
  
  $("#clock").html(currentTimeString);

  var month = months[currentTime.getMonth()];
  var day = days[currentTime.getDay()];
  var date = currentTime.getDate();

  var currentDateString = day + ", " + month + " " + date
  $("#date").html(currentDateString);
 }
