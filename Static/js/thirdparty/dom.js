/**
Copyright (c) 2014-2020, Specialisterne, Jacob Christian Munch-Andersen.
http://dk.specialisterne.com/
All rights reserved.
Authors:
Jacob Christian Munch-Andersen

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met: 

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer. 
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution. 

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
**/
// For information and latest version see: https://github.com/NoHatCoder/DOM_Maker

//DOM Maker version 0.8.
var dom=(function(){
	//Build a translation object for fixing property casing, the content has been determined experimentally, I can't find a reference for this.
	var upperProperties=["acceptCharset","accessKey","bgColor","cellPadding","cellSpacing","codeBase","colSpan","contentEditable","contextMenu","dateTime","dirName","formAction","formEnctype","formMethod","formNoValidate","formTarget","frameBorder","httpEquiv","isMap","itemId","itemProp","itemRef","itemScope","itemType","itemValue","maxLength","noValidate","readOnly","rowSpan","tabIndex","useMap"]
	var translateProperties={"for":"htmlFor"}
	var a
	for(a=0;a<upperProperties.length;a++){
		translateProperties[upperProperties[a].toLowerCase()]=upperProperties[a]
	}
	function dom(tagName,properties){
		var innerProperties={}
		var firstChild=1
		var element
		var a
		var key
		var styleKey
		var attributeKey
		if(typeof tagName!="string"){
			return err("TagName must be a string.")
		}
		//Detect if a properties object has been passed.
		if(properties && typeof properties=="object" && !properties.nodeType && !isFinite(properties.length)){
			innerProperties=properties
			firstChild=2
		}
		if(tagName=="fragment"){
			element=document.createDocumentFragment()
		}
		else{
			element=document.createElement(tagName)
		}
		for(key in innerProperties){
			if(key=="style"){
				if(typeof innerProperties.style=="object"){
					for(styleKey in innerProperties.style){
						element.style[styleKey]=innerProperties.style[styleKey]+""
					}
				}
				else{
					return err("Style attribute must be an object.")
				}
			}
			else if(key=="class" || key=="className"){
				if(typeof innerProperties[key]=="object" && innerProperties[key].length>=0){
					element.className=Array.prototype.join.call(innerProperties[key]," ")
				}
				else{
					element.className=innerProperties[key]+""
				}
			}
			else if(key=="attributes"){
				for(attributeKey in innerProperties[key]){
					element.setAttribute(attributeKey,innerProperties[key][attributeKey])
				}
			}
			else if(translateProperties.hasOwnProperty(key)){
				element[translateProperties[key]]=innerProperties[key]
			}
			else{
				element[key]=innerProperties[key]
			}
		}
		for(a=firstChild;a<arguments.length;a++){
			appendElement(arguments[a])
		}
		function appendElement(subElement){
			var childType=typeof subElement
			var stringArray
			var b
			if(subElement===null){
			}
			else if(childType=="string"){
				stringArray=subElement.split(/\r\n?|\n\r?/g)
				for(b=0;b<stringArray.length;b++){
					if(b){
						element.appendChild(document.createElement("br"))
					}
					if(stringArray[b]){
						element.appendChild(document.createTextNode(stringArray[b]))
					}
				}
			}
			else if(childType=="number"){
				element.appendChild(document.createTextNode(""+subElement))
			}
			else if(childType=="object" && subElement.nodeType){
				element.appendChild(subElement)
			}
			else if(childType=="object" && isFinite(subElement.length)){
				//Array or arraylike, treat recursively.
				for(b=0;b<subElement.length;b++){
					appendElement(subElement[b])
				}
			}
			else{
				element.appendChild(err("Child element must be a DOM element, string, number, array or null."))
			}
		}
		function err(message){
			if(dom.errorClass===undefined){
				throw new Error(message)
			}
			else{
				try{
					console.log(new Error(message))
				}
				catch(e){}
				return dom.SPAN({className:""+dom.errorClass},message)
			}
		}
		return element
	}
	function curry(fn){
		var outerArguments=arguments
		function curryWrap(){
			var a,b
			var finalArguments=[]
			for(a=1,b=0;a<outerArguments.length;a++){
				if(outerArguments[a]===undefined){
					finalArguments.push(arguments[b++])
				}
				else{
					finalArguments.push(outerArguments[a])
				}
			}
			for(;b<arguments.length;b++){
				finalArguments.push(arguments[b])
			}
			return fn.apply(this,finalArguments)
		}
		return curryWrap
	}
	dom.curry=curry
	dom.errorClass=undefined
	var elems=["A","ABBR","ACRONYM","ADDRESS","APPLET","AREA","ARTICLE","ASIDE","AUDIO","B","BASE","BASEFONT","BDI","BDO","BGSOUND","BIG","BLINK","BLOCKQUOTE","BODY","BR","BUTTON","CANVAS","CAPTION","CENTER","CITE","CODE","COL","COLGROUP","CONTENT","DATA","DATALIST","DD","DECORATOR","DEL","DETAILS","DFN","DIALOG","DIR","DIV","DL","DT","ELEMENT","EM","EMBED","FIELDSET","FIGCAPTION","FIGURE","FONT","FOOTER","FORM","FRAME","FRAMESET","H1","H2","H3","H4","H5","H6","HEAD","HEADER","HGROUP","HR","HTML","I","IFRAME","IMG","INPUT","INS","ISINDEX","KBD","KEYGEN","LABEL","LEGEND","LI","LINK","LISTING","MAIN","MAP","MARK","MARQUEE","MENU","MENUITEM","META","METER","NAV","NOBR","NOFRAMES","NOSCRIPT","OBJECT","OL","OPTGROUP","OPTION","OUTPUT","P","PARAM","PLAINTEXT","PRE","PROGRESS","Q","RP","RT","RUBY","S","SAMP","SCRIPT","SECTION","SELECT","SHADOW","SMALL","SOURCE","SPACER","SPAN","STRIKE","STRONG","STYLE","SUB","SUMMARY","SUP","TABLE","TBODY","TD","TEMPLATE","TEXTAREA","TFOOT","TH","THEAD","TIME","TITLE","TR","TRACK","TT","U","UL","VAR","VIDEO","WBR","XMP","FRAGMENT"]
	for(a=0;a<elems.length;a++){
		window[elems[a]]=dom[elems[a]]=curry(dom,elems[a].toLowerCase())
	}
	return dom
}());