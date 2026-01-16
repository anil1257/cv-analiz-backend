function scoreByPosition(position, text) {

  let education = 0
  let experience = 0
  let projects = 0
  let skills = 0
  let quality = 0

  const t = text.toLowerCase()

  // Genel
  if (t.includes("üniversite") || t.includes("lisans")) education += 30
  if (t.includes("staj") || t.includes("experience")) experience += 30
  if (t.includes("proje") || t.includes("project")) projects += 30

  if (position === "Android Developer") {
    if (t.includes("kotlin")) skills += 40
    if (t.includes("mvvm")) quality += 30
    if (t.includes("firebase")) skills += 20
  }

  if (position === "Backend Developer") {
    if (t.includes("api")) skills += 30
    if (t.includes("node")) skills += 30
    if (t.includes("database")) experience += 30
  }

  if (position === "Frontend Developer") {
    if (t.includes("html")) skills += 20
    if (t.includes("css")) skills += 20
    if (t.includes("javascript")) skills += 30
    if (t.includes("react")) quality += 30
  }

  education = Math.min(education, 100)
  experience = Math.min(experience, 100)
  projects = Math.min(projects, 100)
  skills = Math.min(skills, 100)
  quality = Math.min(quality, 100)

  const total = Math.round(
    (education + experience + projects + skills + quality) / 5
  )

  return {
    total,
    breakdown: {
      education,
      experience,
      projects,
      skills,
      quality
    }
  }
}

function generateSummary(score) {
  if (score >= 80) return "CV pozisyon için oldukça uygun."
  if (score >= 60) return "CV iyi durumda ancak geliştirilebilir."
  if (score >= 40) return "CV temel gereksinimleri kısmen karşılıyor."
  return "CV pozisyon için yetersiz, önemli geliştirme gerekli."
}

function getSuggestions(position, text) {

  const list = []
  const t = text.toLowerCase()

  if (position === "Android Developer") {
    if (!t.includes("kotlin")) list.push("Kotlin deneyimini mutlaka belirt.")
    if (!t.includes("mvvm")) list.push("MVVM mimarisi ile projeler ekle.")
    if (!t.includes("github")) list.push("GitHub profil linkini CV'ye ekle.")
    if (!t.includes("firebase")) list.push("Firebase kullandığın projeleri yaz.")
  }

  if (position === "Backend Developer") {
    if (!t.includes("api")) list.push("API geliştirme deneyimini detaylandır.")
    if (!t.includes("docker")) list.push("Docker bilgini eklersen artı puan olur.")
    if (!t.includes("database")) list.push("Veritabanı teknolojilerini açıkça yaz.")
  }

  if (position === "Frontend Developer") {
    if (!t.includes("react")) list.push("React veya benzeri framework ekle.")
    if (!t.includes("responsive")) list.push("Responsive tasarım tecrübeni belirt.")
  }

  if (list.length === 0) return "CV gayet iyi görünüyor, bu pozisyon için uygunsun."

  return list
}

module.exports = {
  scoreByPosition,
  generateSummary,
  getSuggestions
}
