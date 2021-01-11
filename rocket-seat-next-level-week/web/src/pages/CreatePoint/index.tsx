import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { Link, useHistory } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import axios from "axios";
import api from "../../services/api";

import "./styles.css";

import logo from "../../assets/logo.svg";

interface Item {
    id: number;
    title: string;
    image_url: string;
}

interface IBGEUFResponse {
    sigla: string;
}

interface IBGECityResponse {
    nome: string;
}

const sortAlphabetically = (a: string, b: string) => {
    return a.localeCompare(b);
};

const CreatePoint = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [ufs, setUfs] = useState<string[]>([]);
    const [cities, setCities] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        whatsapp: "",
    });

    const [selectedUf, setSelectedUf] = useState("0");
    const [selectedCity, setSelectedCity] = useState("0");
    const [selectedItems, setSelectedItems] = useState<number[]>([]);

    const [initialPosition, setInitialPosition] = useState<[number, number]>([
        -26.9161329,
        -48.6643288,
    ]);

    const [selectedPosition, setSelectedPosition] = useState<[number, number]>([
        -26.9161329,
        -48.6643288,
    ]);

    const history = useHistory();

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = await position.coords;

            setInitialPosition([latitude, longitude]);
            setSelectedPosition([latitude, longitude]);
        });
    }, []);

    useEffect(() => {
        api.get("items").then((response) => {
            setItems(response.data);
        });
    }, []);

    useEffect(() => {
        axios
            .get<IBGEUFResponse[]>(
                "https://servicodados.ibge.gov.br/api/v1/localidades/estados"
            )
            .then((response) => {
                const ufInitials: string[] = response.data.map(
                    (uf) => uf.sigla
                );

                ufInitials.sort(sortAlphabetically);

                setUfs(ufInitials);
            });
    }, []);

    useEffect(() => {
        if (selectedUf === "0") {
            return;
        }

        axios
            .get<IBGECityResponse[]>(
                `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUf}/municipios`
            )
            .then((response) => {
                const cityNames = response.data.map((city) => city.nome);

                cityNames.sort(sortAlphabetically);

                setCities(cityNames);
            });
    }, [selectedUf]);

    function handleSelectUf(event: ChangeEvent<HTMLSelectElement>) {
        const uf = event.target.value;

        setSelectedUf(uf);
    }

    function handleSelectCity(event: ChangeEvent<HTMLSelectElement>) {
        const city = event.target.value;
        setSelectedCity(city);
    }

    function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
        const { name, value } = event.target;
        setFormData({ ...formData, [name]: value });
    }

    function handleSelectItem(id: number) {
        const alreadySelected = selectedItems.findIndex((item) => item === id);

        let items: number[] = [];

        if (alreadySelected >= 0) {
            const filteredItems = selectedItems.filter((item) => item !== id);

            items = filteredItems;
        } else {
            items = [...selectedItems, id];
        }

        setSelectedItems(items);
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const { name, email, whatsapp } = formData;
        const uf = selectedUf;
        const city = selectedCity;
        const [latitude, longitude] = selectedPosition;
        const items = selectedItems;

        const data = {
            name,
            email,
            whatsapp,
            uf,
            city,
            latitude,
            longitude,
            items,
        };

        await api.post("points", data);

        alert("Ponto de coleta criado!");

        history.push("/");
    }

    const Markers = () => {
        useMapEvents({
            click(e) {
                setSelectedPosition([e.latlng.lat, e.latlng.lng]);
            },
        });

        return selectedPosition ? (
            <Marker
                key={selectedPosition[0]}
                position={selectedPosition}
                interactive={false}
            />
        ) : (
            <Marker
                key={initialPosition[0]}
                position={initialPosition}
                interactive={false}
            />
        );
    };

    return (
        <div id="page-create-point">
            <header>
                <img src={logo} alt="Ecoleta" />

                <Link to="/">
                    <FiArrowLeft />
                    Voltar para home
                </Link>
            </header>

            <form onSubmit={handleSubmit}>
                <h1>
                    Cadastro do
                    <br />
                    ponto de coleta
                </h1>

                <fieldset>
                    <legend>
                        <h2>Dados</h2>
                    </legend>

                    <div className="field">
                        <label htmlFor="name">Nome da entidade</label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="field-group">
                        <div className="field">
                            <label htmlFor="email">E-mail</label>
                            <input
                                type="email"
                                name="email"
                                id="email"
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="field">
                            <label htmlFor="whatsapp">WhatsApp</label>
                            <input
                                type="text"
                                name="whatsapp"
                                id="whatsapp"
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                </fieldset>

                <fieldset>
                    <legend>
                        <h2>Endereço</h2>
                        <span>Selecione o endereço no mapa</span>
                    </legend>

                    <MapContainer center={initialPosition} zoom={2}>
                        <TileLayer
                            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <Markers />
                    </MapContainer>

                    <div className="field-group">
                        <div className="field">
                            <label htmlFor="uf">Estado (UF)</label>
                            <select
                                name="uf"
                                id="uf"
                                value={selectedUf}
                                onChange={handleSelectUf}
                            >
                                <option value="0">Selecione uma UF</option>

                                {ufs.map((uf) => (
                                    <option key={uf} value={uf}>
                                        {uf}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="field">
                            <label htmlFor="city">Cidade</label>
                            <select
                                name="city"
                                id="city"
                                value={selectedCity}
                                onChange={handleSelectCity}
                            >
                                <option value="0">Selecione uma cidade</option>
                                {cities.map((city) => (
                                    <option key={city} value={city}>
                                        {city}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </fieldset>

                <fieldset>
                    <legend>
                        <h2>Ítens de coleta</h2>
                        <span>Selecione um ou mais itens abaixo</span>
                    </legend>

                    <ul className="items-grid">
                        {items.map((item) => (
                            <li
                                key={item.id}
                                onClick={() => handleSelectItem(item.id)}
                                className={
                                    selectedItems.includes(item.id)
                                        ? "selected"
                                        : ""
                                }
                            >
                                <img src={item.image_url} alt={item.title} />
                                <span>{item.title}</span>
                            </li>
                        ))}
                    </ul>
                </fieldset>

                <button type="submit">Cadastrar ponto de coleta </button>
            </form>
        </div>
    );
};

export default CreatePoint;
