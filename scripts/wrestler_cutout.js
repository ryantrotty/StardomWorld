// Wrestler photo copy with the white background replaced (2.35.2). JavaScript for Automation, run by
// scripts/make_wrestler_spots.py:
//   osascript -l JavaScript scripts/wrestler_cutout.js <original> <out.jpg> <width> <height> <topHex> <bottomHex> <quality>
// The macOS subject cut-out (Vision, the same one Photos uses to lift a subject; macOS 14 or later) separates the
// wrestler from the backdrop; she is laid over a top-to-bottom fade and the result is scaled to fill width x height
// (cropped from the middle) and saved as a JPEG. Prints "ok", or why it could not ("no subject", ...).
ObjC.import('Foundation'); ObjC.import('Vision'); ObjC.import('CoreImage'); ObjC.import('CoreGraphics');

function color(hex) {
  var h = String(hex).replace('#', '');
  return $.CIColor.colorWithRedGreenBlue(parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255);
}

function run(argv) {
  var src = argv[0], out = argv[1], W = +argv[2], H = +argv[3], top = argv[4], bottom = argv[5], q = +argv[6];
  var url = $.NSURL.fileURLWithPath(src);
  var handler = $.VNImageRequestHandler.alloc.initWithURLOptions(url, $.NSDictionary.dictionary);
  var req = $.VNGenerateForegroundInstanceMaskRequest.alloc.init;
  var err = Ref();
  if (!handler.performRequestsError($.NSArray.arrayWithObject(req), err)) return 'cut-out failed';
  var obs = req.results.firstObject;
  if (!obs || obs.isNil()) return 'no subject';
  var buf = obs.generateMaskedImageOfInstancesFromRequestHandlerCroppedToInstancesExtentError(obs.allInstances, handler, false, err);
  if (!buf) return 'no mask';
  var fg = $.CIImage.imageWithCVPixelBuffer(buf);
  var ext = fg.extent, w = ext.size.width, h = ext.size.height;

  // The fade: topHex at the top, bottomHex at the bottom (Core Image counts y from the bottom).
  var g = $.CIFilter.filterWithName('CILinearGradient');
  g.setValueForKey($.CIVector.vectorWithXY(0, h), 'inputPoint0');
  g.setValueForKey(color(top), 'inputColor0');
  g.setValueForKey($.CIVector.vectorWithXY(0, 0), 'inputPoint1');
  g.setValueForKey(color(bottom), 'inputColor1');
  var bg = g.outputImage.imageByCroppingToRect(ext);

  var comp = $.CIFilter.filterWithName('CISourceOverCompositing');
  comp.setValueForKey(fg, 'inputImage');
  comp.setValueForKey(bg, 'inputBackgroundImage');
  var img = comp.outputImage;

  // Fill width x height, cropped from the middle.
  var s = Math.max(W / w, H / h);
  var sc = $.CIFilter.filterWithName('CILanczosScaleTransform');
  sc.setValueForKey(img, 'inputImage');
  sc.setValueForKey($.NSNumber.numberWithDouble(s), 'inputScale');
  sc.setValueForKey($.NSNumber.numberWithDouble(1), 'inputAspectRatio');
  img = sc.outputImage;
  var e2 = img.extent;
  img = img.imageByCroppingToRect($.CGRectMake(e2.origin.x + Math.floor((e2.size.width - W) / 2), e2.origin.y + Math.floor((e2.size.height - H) / 2), W, H));
  img = img.imageByApplyingTransform($.CGAffineTransformMakeTranslation(-img.extent.origin.x, -img.extent.origin.y));

  var ctx = $.CIContext.contextWithOptions($.NSDictionary.dictionary);
  var opts = $.NSDictionary.dictionaryWithObjectForKey($.NSNumber.numberWithDouble(q), 'kCGImageDestinationLossyCompressionQuality');
  var ok = ctx.writeJPEGRepresentationOfImageToURLColorSpaceOptionsError(img, $.NSURL.fileURLWithPath(out), $.CGColorSpaceCreateDeviceRGB(), opts, err);
  return ok ? 'ok' : 'write failed';
}
