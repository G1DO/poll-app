resource "kubernetes_namespace" "poll_app" {
  metadata {
    name = "poll-app"
  }
}

resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"
  }
}
