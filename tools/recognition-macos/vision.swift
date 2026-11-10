import Foundation
import Vision
import AppKit
let url = URL(fileURLWithPath: CommandLine.arguments[1])
let kind = CommandLine.arguments[2]
let handler = VNImageRequestHandler(url: url, options: [:])
do {
 if kind == "label" {
  let req = VNRecognizeTextRequest(); req.recognitionLevel = .accurate; req.usesLanguageCorrection = false
  req.recognitionLanguages = ["en-US", "zh-Hans", "fr-FR", "de-DE"]
  try handler.perform([req])
  let lines = (req.results ?? []).compactMap { $0.topCandidates(1).first?.string }
  let boxes = (req.results ?? []).compactMap { row -> [String:Any]? in
   guard let text = row.topCandidates(1).first?.string else { return nil }
   return ["text":text, "x":row.boundingBox.midX, "y":row.boundingBox.midY, "height":row.boundingBox.height]
  }
  let data = try JSONSerialization.data(withJSONObject: ["lines":lines,"boxes":boxes]); print(String(data:data,encoding:.utf8)!)
 } else {
  let req = VNClassifyImageRequest(); try handler.perform([req])
  let rows = (req.results ?? []).prefix(20).map { ["identifier": $0.identifier, "confidence": $0.confidence] as [String:Any] }
  let data = try JSONSerialization.data(withJSONObject: ["classes":rows]); print(String(data:data,encoding:.utf8)!)
 }
} catch { fputs("\(error)\n", stderr); exit(1) }
