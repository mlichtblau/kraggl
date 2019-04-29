workflow "Build and Push to Dockerhub" {
  on = "push"
  resolves = ["Push Image"]
}

action "Filter master branch" {
  uses = "actions/bin/filter@3c0b4f0e63ea54ea5df2914b4fabf383368cd0da"
  args = "branch master"
}

action "Docker Login" {
  uses = "actions/docker/login@8cdf801b322af5f369e00d85e9cf3a7122f49108"
  needs = ["Filter master branch"]
  secrets = ["DOCKER_PASSWORD", "DOCKER_USERNAME"]
}

action "Build Image" {
  uses = "actions/docker/cli@8cdf801b322af5f369e00d85e9cf3a7122f49108"
  needs = ["Docker Login"]
  args = "build -t lichtblau/kraggl:master ."
}

action "Push Image" {
  uses = "actions/docker/cli@8cdf801b322af5f369e00d85e9cf3a7122f49108"
  needs = ["Build Image"]
  args = "push lichtblau/kraggl:master"
}

workflow "Build and Push Develop" {
  on = "push"
  resolves = ["Push Develop Image"]
}

action "Filter develop branch" {
  uses = "actions/bin/filter@3c0b4f0e63ea54ea5df2914b4fabf383368cd0da"
  args = "branch develop"
}

action "Docker Develop Login" {
  uses = "actions/docker/login@8cdf801b322af5f369e00d85e9cf3a7122f49108"
  needs = ["Filter develop branch"]
  secrets = ["DOCKER_PASSWORD", "DOCKER_USERNAME"]
}

action "Build Develop Image" {
  uses = "actions/docker/cli@8cdf801b322af5f369e00d85e9cf3a7122f49108"
  args = "build -t lichtblau/kraggl:develop ."
  needs = ["Docker Develop Login"]
}

action "Push Develop Image" {
  uses = "actions/docker/cli@8cdf801b322af5f369e00d85e9cf3a7122f49108"
  needs = ["Build Develop Image"]
  args = "push lichtblau/kraggl:develop"
}
