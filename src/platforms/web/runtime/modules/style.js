/* @flow */

// Lynx Modify
import { cached, camelize, extend, isDef, isUndef } from 'shared/util'


function setStyles(elm: Element, styles: Object) {
  for(let key in styles) {
    elm.setStyle(key, styles[key])
  }
}

function isEmptyObject (obj: Object): boolean {
  if (!obj || typeof obj !== 'object') return true

  for (const k in obj) {
    if (({}).hasOwnProperty.call(obj, k)) return false
  }
  return true
}

let emptyStyle
const normalize = cached(function (prop) {
  prop = camelize(prop)
  return prop
})

function setStaticStyles (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  const elm = vnode.elm

  let style, name
  const vm$$data = vnode.context.$data
  const styleSheet = vm$$data.style

  // extend static class styles
  if (vnode.data.staticClass) {
    const classNames = vnode.data.staticClass.split(' ')
    classNames.forEach(cls => {
      if (cls === '') return

      if (styleSheet[cls]) {
        style = extend(style || {}, styleSheet[cls])
      }
    })
  }

  // extend static style styles
  if (!isEmptyObject(vnode.data.staticStyle)) {
    style = extend(style || {}, vnode.data.staticStyle)
  }

  const preStyles = {}
  for (name in style) {
    const norName = normalize(name)
    if (norName) {
      preStyles[norName] = style[name]
    }
  }
  setStyles(elm, preStyles)

  // clone the style for future updates,
  // in case the user mutates the style object in-place.
  if (style) {
    vnode.data.baseStyle = extend({}, style)
  }
}

function createStyle (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  setStaticStyles(oldVnode, vnode)

  // to data binding style
  updateStyle(oldVnode, vnode)
}

function updateStyle (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  if (vnode.data.staticClass !== oldVnode.data.staticClass ||
    vnode.data.staticStyle !== oldVnode.data.staticStyle) {
    setStaticStyles(oldVnode, vnode)
  }

    /**
   * @baseStyle: static staticStyle & staticClass cache
   * @preStyles: current style & class collection
   * @bindClassStyle: -> :class
   * @bindStyle: -> :style
   */

  const elm = vnode.elm
  const oldStyle: any = oldVnode.data.style
  const baseStyle = oldVnode.data.baseStyle || vnode.data.baseStyle

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

  setStyles(elm, preStyles)

  if(elm && !elm.style && !isEmptyObject(preStyles)) {
    elm.setStyle('', '')
  }
}

export default {
  create: createStyle,
  update: updateStyle
}


// import { getStyle, normalizeStyleBinding } from 'web/util/style'
// import { cached, camelize, extend, isDef, isUndef } from 'shared/util'

// const cssVarRE = /^--/
// const importantRE = /\s*!important$/
// const setProp = (el, name, val) => {
//   /* istanbul ignore if */
//   if (cssVarRE.test(name)) {
//     el.style.setProperty(name, val)
//   } else if (importantRE.test(val)) {
//     el.style.setProperty(name, val.replace(importantRE, ''), 'important')
//   } else {
//     const normalizedName = normalize(name)
//     if (Array.isArray(val)) {
//       // Support values array created by autoprefixer, e.g.
//       // {display: ["-webkit-box", "-ms-flexbox", "flex"]}
//       // Set them one by one, and the browser will only set those it can recognize
//       for (let i = 0, len = val.length; i < len; i++) {
//         el.style[normalizedName] = val[i]
//       }
//     } else {
//       el.style[normalizedName] = val
//     }
//   }
// }

// const vendorNames = ['Webkit', 'Moz', 'ms']

// let emptyStyle
// const normalize = cached(function (prop) {
//   emptyStyle = emptyStyle || document.createElement('div').style
//   prop = camelize(prop)
//   if (prop !== 'filter' && (prop in emptyStyle)) {
//     return prop
//   }
//   const capName = prop.charAt(0).toUpperCase() + prop.slice(1)
//   for (let i = 0; i < vendorNames.length; i++) {
//     const name = vendorNames[i] + capName
//     if (name in emptyStyle) {
//       return name
//     }
//   }
// })

// function updateStyle (oldVnode: VNodeWithData, vnode: VNodeWithData) {
//   const data = vnode.data
//   const oldData = oldVnode.data

//   if (isUndef(data.staticStyle) && isUndef(data.style) &&
//     isUndef(oldData.staticStyle) && isUndef(oldData.style)
//   ) {
//     return
//   }

//   let cur, name
//   const el: any = vnode.elm
//   const oldStaticStyle: any = oldData.staticStyle
//   const oldStyleBinding: any = oldData.normalizedStyle || oldData.style || {}

//   // if static style exists, stylebinding already merged into it when doing normalizeStyleData
//   const oldStyle = oldStaticStyle || oldStyleBinding

//   const style = normalizeStyleBinding(vnode.data.style) || {}

//   // store normalized style under a different key for next diff
//   // make sure to clone it if it's reactive, since the user likley wants
//   // to mutate it.
//   vnode.data.normalizedStyle = isDef(style.__ob__)
//     ? extend({}, style)
//     : style

//   const newStyle = getStyle(vnode, true)

//   for (name in oldStyle) {
//     if (isUndef(newStyle[name])) {
//       setProp(el, name, '')
//     }
//   }
//   for (name in newStyle) {
//     cur = newStyle[name]
//     if (cur !== oldStyle[name]) {
//       // ie9 setting to null has no effect, must use empty string
//       setProp(el, name, cur == null ? '' : cur)
//     }
//   }
// }

// export default {
//   create: updateStyle,
//   update: updateStyle
// }
