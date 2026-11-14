// Rende le pagine di un PDF come JPEG già sfocati (le anteprime pubbliche).
// Uso: swift render.swift <file.pdf> <cartella-uscita> <max-pagine>
// Stampa il numero totale di pagine. La sfocatura è nei pixel: il testo non si può recuperare.
import AppKit
import CoreImage
import PDFKit

let args = CommandLine.arguments
guard args.count == 4, let doc = PDFDocument(url: URL(fileURLWithPath: args[1])), let maxPages = Int(args[3]) else {
  FileHandle.standardError.write("uso: swift render.swift <file.pdf> <cartella> <max-pagine>\n".data(using: .utf8)!)
  exit(1)
}
let outDir = URL(fileURLWithPath: args[2], isDirectory: true)
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

let small: CGFloat = 300   // larghezza a cui si rasterizza: il testo normale diventa di 4-5 px
let blurRadius = 6.0       // poi una sfocatura forte cancella ogni lettera
let outWidth: CGFloat = 720
let ctx = CIContext()
let srgb = CGColorSpace(name: CGColorSpace.sRGB)!

print(doc.pageCount)
for i in 0..<min(doc.pageCount, maxPages) {
  guard let page = doc.page(at: i) else { continue }
  let box = page.bounds(for: .mediaBox)
  let scale = small / box.width
  let w = Int(small), h = Int((box.height * scale).rounded())
  guard let bmp = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: srgb,
                            bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { continue }
  bmp.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
  bmp.fill(CGRect(x: 0, y: 0, width: w, height: h))
  bmp.scaleBy(x: scale, y: scale)
  page.draw(with: .mediaBox, to: bmp)
  guard let raster = bmp.makeImage() else { continue }

  let input = CIImage(cgImage: raster)
  let blurred = input.clampedToExtent()
    .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: blurRadius])
    .cropped(to: input.extent)
  let up = outWidth / small
  let big = blurred.applyingFilter("CILanczosScaleTransform", parameters: [kCIInputScaleKey: up, kCIInputAspectRatioKey: 1.0])
  let url = outDir.appendingPathComponent("\(i + 1).jpg")
  try ctx.writeJPEGRepresentation(of: big, to: url, colorSpace: srgb,
                                  options: [CIImageRepresentationOption(rawValue: kCGImageDestinationLossyCompressionQuality as String): 0.72])
}
