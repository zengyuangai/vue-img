const VueImg$1 = Object.create(null);
// Check webP support
VueImg$1.canWebp = false;
const img = new Image();
img.onload = () => { VueImg$1.canWebp = true; };
img.src = 'data:image/webp;base64,UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAsAAAABBxAREYiI/gcAAABWUDggGAAAADABAJ0BKgEAAQABABwlpAADcAD+/gbQAA==';

// Default cdn prefix
const protocol = location.protocol === 'https:' ? 'https://' : 'http://';
const env = document.domain.match(/.(alpha|beta|ar).ele(net)?.me$/);
VueImg$1.cdn = protocol + (env ? `fuss${env[0]}` : 'fuss10.elemecdn.com');

const hasProp = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
const html = document.documentElement;

const copyKeys = ({ source, target, keys }) => {
  keys.forEach(key => {
    if (hasProp(source, key)) {
      target[key] = source[key];
    }
  });
};

const setAttr = (el, src, tag) => {
  if (tag === 'img') {
    el.src = src;
  } else {
    el.style.backgroundImage = `url('${src}')`;
  }
};

const resize = (size) => {
  let viewWidth;
  const dpr = window.devicePixelRatio;
  const dataDpr = document.documentElement.getAttribute('data-dpr');
  const ratio = dataDpr ? (dpr / dataDpr) : dpr;

  try {
    viewWidth = +(html.getAttribute('style').match(/(\d+)/) || [])[1];
  } catch(e) {
    const w = html.offsetWidth;
    if (w / dpr > 540) {
      viewWidth = 540 * dpr / 10;
    } else {
      viewWidth = w / 10;
    }
  }

  viewWidth = viewWidth * ratio;

  if (Number(viewWidth) >= 0 && typeof viewWidth === 'number') {
    return (size * viewWidth) / 75 // 75 is the 1/10 iphone6 deivce width pixel
  } else {
    return size
  }
};

const inViewport = (el) => {
  const rect = el.getBoundingClientRect();

  return rect.top > 0
    && rect.bottom < window.innerHeight
    && rect.left > 0
    && rect.right < window.innerWidth
};

// Translate hash to path
const hashToPath = hash => hash.replace(/^(\w)(\w\w)(\w{29}(\w*))$/, '/$1/$2/$3.$4');

// Get image format
const getFormat = ({ format, fallback }) => {
  const isFormat = /^(jpg|jpeg|png|gif)$/;

  if (isFormat.test(format)) return `format/${format}/`
  if (VueImg$1.canWebp) return 'format/webp/'
  return isFormat.test(fallback)
    ? `format/${fallback}/`
    : ''
};

// Get image size
const getSize = ({ width, height, adapt }) => {

  const w = width && (adapt ? resize(width) : width);
  const h = height && (adapt ? resize(height) : height);

  const thumb = 'thumbnail/';
  const cover = `${w}x${h}`;

  if (width && height) return `${thumb}!${cover}r/gravity/Center/crop/${cover}/`
  if (width) return `${thumb}${w}x/`
  if (height) return `${thumb}x${h}/`

  return ''
};

// Get image size
const getSrc = ({
  hash, adapt,
  width, height, quality,
  format, fallback,
  prefix, suffix,
  urlFormatter,
} = {}) => {
  if (!hash || typeof hash !== 'string') return ''

  const _prefix = typeof prefix === 'string' ? prefix : VueImg$1.cdn;
  const _quality = typeof quality === 'number' ? `quality/${quality}/` : '';
  const _format = getFormat({ format, fallback });
  const _size = getSize({ width, height, adapt });
  const _suffix = typeof suffix === 'string' ? suffix : '';
  const params = `${_quality}${_format}${_size}${_suffix}`;
  let src = _prefix + hashToPath(hash) + (params ? `?imageMogr/${params}` : '');
  if (typeof urlFormatter === 'function') src = urlFormatter(src);
  return src
};

var getImageClass = (opt = {}) => {
  class GlobalOptions {
    constructor() {
      // Global
      copyKeys({
        source: opt,
        target: this,
        keys: [
          'loading', 'error',
          'quality', 'delay',
          'prefix', 'suffix', 'adapt',
        ],
      });
    }

    hashToSrc(hash) {
      const params = { hash };
      // Get src
      copyKeys({
        source: this,
        target: params,
        keys: [
          'width', 'height', 'quality',
          'format', 'fallback', 'adapt',
          'prefix', 'suffix',
        ],
      });
      return getSrc(params)
    }
  }

  class vImg extends GlobalOptions {
    constructor(value) {
      const params = value && typeof value === 'object'
        ? value
        : { hash: value };

      super();
      // Directive
      copyKeys({
        source: params,
        target: this,
        keys: [
          'hash', 'loading', 'error',
          'width', 'height', 'quality',
          'format', 'fallback', 'adapt',
          'prefix', 'suffix', 'defer',
          'urlFormatter',
        ],
      });
    }

    toImageSrc() {
      return this.hashToSrc(this.hash)
    }

    toLoadingSrc() {
      return this.hashToSrc(this.loading)
    }

    toErrorSrc() {
      return this.hashToSrc(this.error)
    }
  }

  return vImg
};

// Vue plugin installer
const install = (Vue, opt) => {
  const vImg = getImageClass(opt);
  const promises = [];

  const update = (el, binding, vnode) => {
    const vImgIns = new vImg(binding.value);
    const vImgSrc = vImgIns.toImageSrc();
    const vImgErr = vImgIns.toErrorSrc();

    if (!vImgSrc) return Promise.resolve()

    const img = new Image();
    const delay = +vImgIns.delay || 5000;

    return new Promise(resolve => {
      img.onload = () => {
        setAttr(el, vImgSrc, vnode.tag);
        resolve();
      };
      if (vImgErr) {
        img.onerror = () => {
          setAttr(el, vImgErr, vnode.tag);
          resolve();
        };
      }
      setTimeout(() => {
        resolve();
      }, delay);
      img.src = vImgSrc;
    })
  };

  // Register Vue directive
  Vue.directive('img', {
    bind(el, binding, vnode) {
      const loadSrc = new vImg(binding.value).toLoadingSrc();
      const { defer } = binding.value;

      if (loadSrc) setAttr(el, loadSrc, vnode.tag);
      if (!defer) {
        promises.push(update(el, binding, vnode));
      }
    },
    inserted(el, binding, vnode) {
      const { defer } = binding.value;
      if (!defer) return
      if (inViewport(el)) {

        promises.push(update(el, binding, vnode));

      } else {

        Vue.nextTick(() => {
          Promise.all(promises)
          .then(() => {
            promises.length = 0;
            update(el, binding, vnode);
          })
          .catch(() => {});
        });

      }
    },
    update,
  });
};

VueImg$1.getSrc = getSrc;
VueImg$1.install = install;

export default VueImg$1;
