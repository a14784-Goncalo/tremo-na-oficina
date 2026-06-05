const currentWord =
document.getElementById("currentWord");

function adicionarLetra(letra){

  if(window.tremo.palavraAtual.length >= 5){
    return;
  }

  window.tremo.palavraAtual += letra;

  currentWord.textContent =
  window.tremo.palavraAtual;
}

document
.getElementById("clearBtn")
.addEventListener("click", () => {

  window.tremo.palavraAtual = "";
  currentWord.textContent = "";

});