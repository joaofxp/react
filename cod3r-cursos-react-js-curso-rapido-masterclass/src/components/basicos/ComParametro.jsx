import React from "react";

const ComParametro = (props) => {
    // props é somente leitura!!!!
    // props.titulo = "Outro Título";
    return (
        <>
            <h3>{props.titulo}</h3>
            <p>{props.subtitulo}</p>
        </>
    );
};

export default ComParametro;
