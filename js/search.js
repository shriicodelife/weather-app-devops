let apiKey = "1e3e8f230b6064d27976e41163a82b77";
let searchinput = typeof document !== "undefined" ? document.querySelector(`.searchinput`) : null;

function getWeatherIcon(condition) {
    if (condition === "Rain") {
        return "img/rain.png";
    } else if (condition === "Clear") {
        return "img/sun.png";
    } else if (condition === "Snow") {
        return "img/snow.png";
    } else if (condition === "Clouds" || condition === "Smoke") {
        return "img/cloud.png";
    } else if (condition === "Mist" || condition === "Fog") {
        return "img/mist.png";
    } else if (condition === "Haze") {
        return "img/haze.png";
    } else if (condition === "Thunderstorm") {
        return "img/thunderstorm.png";
    }

    return "";
}

function buildWeatherUrl(city, state, country) {
    return `https://api.openweathermap.org/data/2.5/weather?units=metric&q=${city},${state},${country}&appid=${apiKey}`;
}

async function search(city, state, country){
    let url = await fetch(buildWeatherUrl(city, state, country));

    if(url.ok){
    let data = await url.json();
    console.log(data);
    
    let box = document.querySelector(".return");
    box.style.display = "block";

    let message = document.querySelector(".message");
    message.style.display = "none";

    let errormessage = document.querySelector( ".error-message");
        errormessage.style.display = "none";

    let weatherImg = document.querySelector(".weather-img");
    document.querySelector(".city-name").innerHTML = data.name;
    document.querySelector(".weather-temp").innerHTML = Math.floor(data.main.temp) + '°';
    document.querySelector(".wind").innerHTML = Math.floor(data.wind.speed) + " m/s";
    document.querySelector(".pressure").innerHTML = Math.floor(data.main.pressure) + " hPa";
    document.querySelector('.humidity').innerHTML = Math.floor(data.main.humidity)+ "%";
    document.querySelector(".sunrise").innerHTML =  new Date(data.sys.sunrise * 1000).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
    document.querySelector(".sunset").innerHTML =  new Date(data.sys.sunset * 1000).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});

    weatherImg.src = getWeatherIcon(data.weather[0].main);
    } else {
      let box = document.querySelector(".return");
      box.style.display = "none";

      let message = document.querySelector(".message");
      message.style.display = "none";

      let errormessage = document.querySelector(".error-message");
      errormessage.style.display = "block";
    }
}


if (searchinput) {
searchinput.addEventListener('keydown', function(event) {
    if (event.keyCode === 13 || event.which === 13) {
        search(searchinput.value);
        console.log("worked")
      }
  });
}

/* istanbul ignore next */
if (typeof module !== "undefined") {
  module.exports = {
    buildWeatherUrl,
    getWeatherIcon,
    search,
  };
}
