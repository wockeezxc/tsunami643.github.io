!function (global, $) {
  function cachedImage(src) {
    var imgEle = document.createElement('img');
    imgEle.src = src;
    return imgEle.complete || (imgEle.width + imgEle.height) > 0;
  }

  function preloadImage(src) {
    var d = $.Deferred();
    var cached = cachedImage(src);

    function resolve() {
      d.resolve({src: src, cached: cached});
    }

    if (cached) {
      resolve();
    } else {
      var img = new Image();
      img.onload = function () {
        resolve();
      };
      img.src = src;
    }

    return d.promise(src);
  }

  /**
   *
   * @param options
   * @constructor
   */
  function HeroLoader(options) {
    var _this = this;
    this.emitter = $({});

    this.heroes = options.heroes;
    this.loading = null;
    this.cache = {};
    this.currentHero = null;
    this.urlFor = options.urlFor;
    this.$el = options.$el;

    this.$el.on('click', '.prevhero', function () {
      _this.prev();
    });
    this.$el.on('click', '.nexthero', function () {
      _this.next();
    });
  }

  HeroLoader.prototype = {
    preload: function (hero) {
      var _this = this;

      if (!this.cache[hero]) {
        this.cache[hero] = true;
        $.get(this.urlFor(hero)).fail(function () {
          _this.cache[hero] = false;
        });
      }
    },

    next: function () {
      if (!this.currentHero) {
        return;
      }

      this.load(this.heroes.next(this.currentHero));
    },

    prev: function () {
      if (!this.currentHero) {
        return;
      }

      this.load(this.heroes.prev(this.currentHero));
    },

    collapse: function (skipAnimation) {
      this.currentHero = null;
      return $.Velocity.animate(this.$el, 'slideUp', {duration: skipAnimation ? 0 : 300});
    },

    expand: function (skipAnimation) {
      return $.Velocity.animate(this.$el, 'slideDown', {duration: skipAnimation ? 0 : 500});
    },

    load: function (hero, skipAnimation) {
      var _this = this;
      var d = $.Deferred();

      if (this.loading) {
        this.loading.abort();
      }

      if (this.currentHero === hero) {
        return d.promise();
      }

      var collapse = this.collapse(skipAnimation);

      var request = $.get(this.urlFor(hero));
      this.loading = request;

      request.done(function (data) {
        _this.cache[hero] = true;

        collapse.then(function () {
          _this.$el.html(data);

          var $portrait = _this.$el.find('.portrait-img');

          _this.$el.find('.portrait').prepend('<span class="prevhero">&lt;</span>').append('<span class="nexthero">&gt;</span>');

          var src = $portrait.data('src');

          if (src) {
            preloadImage(src).done(function (data) {
              var $frame = _this.$el.find('.portrait-frame');

              if (data.cached) {
                $frame.find('.portrait-img').addClass('from-cache');
              }

              $frame.prepend('<img class="portrait-img portrait-image-loaded" width="256" height="144" src="' + data.src + '">');
              $frame.addClass('portrait-frame-loaded');
            });
          }

          _this.expand(skipAnimation);
          _this.currentHero = hero;

	  _this.emitter.trigger('load', { name: hero });

          d.resolve();
        });
      });

      request.fail(function () {
        _this.cache[hero] = false;
        _this.collapse();

        d.reject();
      });

      request.always(function () {
        _this.loading = null;
      });

      return d.promise();
    },

    onLoad: function (callback) {
      this.emitter.on('load', callback);
    }
  };

  global.HeroLoader = HeroLoader;
}(this, this.jQuery);