resource "kubernetes_deployment" "backend" {
  metadata {
    name      = "backend"
    namespace = kubernetes_namespace.poll_app.metadata[0].name
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "backend"
      }
    }

    template {
      metadata {
        labels = {
          app = "backend"
        }
      }

      spec {
        container {
          name  = "backend"
          image = "nginx:latest"    # placeholder - you'd use your real image
          
          port {
            container_port = 3000
          }
        }
      }
    }
  }
}


resource "kubernetes_service" "backend_service"{
         metadata {
    name      = "backend-service"
    namespace = kubernetes_namespace.poll_app.metadata[0].name
  }
  spec {
    selector = {
      app = "backend" # This 'plugs' the service into your pods
    }

    port {
      port        = 80       # Port the service listens on inside the cluster
      target_port = 3000      # Port your container is actually running on
      node_port   = 30080    # The specific port to hit from outside
    }

    type = "NodePort"
  }
}