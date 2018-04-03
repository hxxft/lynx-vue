/* @flow */
import { cached, camelize, extend, isDef, isUndef, hyphenate, makeMap } from 'shared/util'

const ruleStyles = makeMap(
  'width,height,minWidth,maxWidth,minHeight,maxHeight,margin,padding,' +
  'marginLeft,marginTop,marginRight,marginBottom,' +
  'paddingLeft,paddingTop,paddingRight,paddingBottom,' +
  'left,top,right,bottom,borderWidth,borderRadius,' +
  'fontSize,lineHeight'
)

const normalize = cached(function (prop) {
  prop = camelize(prop)
  return prop
})

function isEmptyObject (obj: Object): boolean {
  if (!obj || typeof obj !== 'object') return true

  for (const k in obj) {
    if (({}).hasOwnProperty.call(obj, k)) return false
  }
  return true
}

const styleValueToCssMap = (styleValue: string): Object => {
  const cssMap = {}
  try {
    const cssRules = styleValue.split(';')
    cssRules.forEach(rule => {
      const ruleMeans = rule.split(':')
      if (ruleMeans.length === 2) {
        const k = ruleMeans[0].trim()
        const v = ruleMeans[1].trim()
        if (v !== 'undefined') {
          cssMap[camelize(k)] = isNaN(v) ? v : +v
        } else {
          if (NODE_ENV !== 'production') {
            warn(
              `dynamic style invalid, ${k} get ${v}`
            )
          }
        }
      }
    })
  } catch (e) {
    if (NODE_ENV !== 'production') {
      warn(
        'style invalid, ' +
        'please check if it spell error.'
      )
    }
  }
  return cssMap
}

export function getStaticStyles (oldVnode: VNode | VNodeWithData, vnode: VNode | VNodeWithData) {

  let style, name
  const vm$$data = vnode && vnode.context ? vnode.context.$data : null
  const styleSheet = vm$$data ? vm$$data.style : null
  const preStyles = {}

  if(!vnode) 
    return preStyles

  // extend static class styles
  if (styleSheet && vnode.data && vnode.data.staticClass) {
    const classNames = vnode.data.staticClass.split(' ')
    classNames.forEach(cls => {
      if (cls === '') return

      if (styleSheet[cls]) {
        style = extend(style || {}, styleSheet[cls])
      }
    })
  }

  // extend static style styles
  if (vnode.data && vnode.data.staticStyle) {
    const cssMap = styleValueToCssMap(vnode.data.staticStyle)
    style = extend(style || {}, cssMap)
  }

  if(!style)
    return preStyles
  
  for (name in style) {
    const norName = normalize(name)
    if (norName) {
      preStyles[norName] = style[name]
    }
  }

  // clone the style for future updates,
  // in case the user mutates the style object in-place.
  if (style) {
    vnode.data.baseStyle = extend({}, style)
  }

  return preStyles;
}

export function getUpdateStyles (oldVnode: VNode | VNodeWithData, vnode: VNode | VNodeWithData) {
   /**
   * @baseStyle: static staticStyle & staticClass cache
   * @preStyles: current style & class collection
   * @bindClassStyle: -> :class
   * @bindStyle: -> :style
   */

  const elm = vnode.elm
  const oldStyle: any = oldVnode && oldVnode.data ? oldVnode.data.style : null
  var baseStyle
  if(oldVnode && oldVnode.data)
    baseStyle = oldVnode.data.baseStyle || vnode.data.baseStyle
  if(vnode && vnode.data)
    baseStyle = vnode.data.baseStyle

  // get default tag styles

  let preStyles = {}
  if (oldStyle) {
    for (const name in oldStyle) {
      // new style wait to del
      const norName = normalize(name)
      if (norName) {
        preStyles[norName] = baseStyle && baseStyle[name] || ''
      }
    }
  }

  // process v-bind:style v-bind:class
  let bindStyle = {}
  const attrs = vnode.data
  const styleMap = vnode.context._data.style
  let bindClassStyle = {}
  if (attrs) {
    // [style1,style2] style1:{color:'#ff3355'},style2:{fontSize:80}
    if (Array.isArray(attrs.style)) {
      for (let i = 0; i < attrs.style.length; i++) {
        bindStyle = extend(bindStyle, attrs.style[i])
      }
    } else if (typeof attrs.style === 'object') {
      // {color:'#ff3355',fontSize:80}
      bindStyle = attrs.style
    }
    // [class1,class2] .class1{height:200} .active{width:400}
    if (Array.isArray(attrs.class)) {
      for (let i = 0; i < attrs.class.length; i++) {
        const klass = attrs.class[i]
        bindClassStyle = extend(bindClassStyle, styleMap[klass])
      }
    } else if (typeof attrs.class === 'object') {
      // {class1:true|false,class2:true|false}
      let truebindStyle = {}
      let falsebindStyle = {}
      for (const klass in attrs.class) {
        if (attrs.class[klass]) {
          truebindStyle = extend(truebindStyle, styleMap[klass])
        } else {
          // class[klass] is false
          const tmpFalsebindStyle = {}
          for (const styleKey in styleMap[klass]) {
            if (baseStyle && baseStyle[styleKey]) {
              tmpFalsebindStyle[styleKey] = baseStyle[styleKey]
            } else {
              tmpFalsebindStyle[styleKey] = ''
            }
          }
          falsebindStyle = extend(falsebindStyle, tmpFalsebindStyle)
        }
      }
      bindClassStyle = extend(bindClassStyle, falsebindStyle)
      bindClassStyle = extend(bindClassStyle, truebindStyle)
    }
  }

  // clone the style for future updates,
  // in case the user mutates the style object in-place.
  const curStyles = extend(bindClassStyle, bindStyle)
  const normalizedCurStyles = {}
  if (!isEmptyObject(curStyles)) {
    for (const key in curStyles) {
      normalizedCurStyles[normalize(key)] = curStyles[key]
    }
    vnode.data.style = normalizedCurStyles
  }

  if (baseStyle) {
    vnode.data.baseStyle = extend({}, baseStyle)
  }

  preStyles = extend(preStyles, normalizedCurStyles)

  return preStyles
}

function transforCssNum2RulerNum (cssValue) {
  var rulerNum = cssValue;

  if (typeof cssValue === 'number') {
    // 对于不带单位的情况，用rpx进行标志
    rulerNum = cssValue + 'rpx';
  } else if (cssValue === 'pixel') {
    rulerNum = 'pixel';  // 客户端自己去转换pixel
  } else if (typeof cssValue === 'string' && cssValue.match(/^[-+]?[0-9]*\.?[0-9]+px$/)) {
    rulerNum = parseFloat(cssValue) + 'px';
  }
  return rulerNum
}

export function getStyleString (vnode: VNode | VNodeWithData) {

  var preStyles = getStaticStyles(null, vnode);
  preStyles = extend(preStyles, getUpdateStyles(null, vnode));
  if(vnode.data.parentStaticStyle)
    preStyles = extend(preStyles, vnode.data.parentStaticStyle);
  if (Object.keys(preStyles) && Object.keys(preStyles).length > 0) {
    var preStylesString = '';
    // camelized css node
    for (var name in preStyles) {
      var norName = hyphenate(name);
      var value = (void 0);
      if (ruleStyles(name)) {
        value = transforCssNum2RulerNum(preStyles[name]);
      } else {
        value = preStyles[name];
      }
      if (value) {
        // value 有可能为'' 或者为undefined魔
        preStylesString += norName + ': ' + value + ';';
      }
    }
    return (" style=" + (JSON.stringify(preStylesString)))
  } else {
    return ''
  }
}
