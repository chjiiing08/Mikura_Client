import styled from "styled-components";

type PurikuraButtonProps = {
  img?: string;
  text?: string;
  className?: string;
  onClick?: () => void;
};

const PurikuraButton = ({
  img,
  text,
  className = "",
  onClick,
}: PurikuraButtonProps) => {
  return (
    <Button type="button" onClick={onClick} className={className}>
      {img && <ButtonImage src={img} alt="" />}

      {text && <ButtonText>{text}</ButtonText>}
    </Button>
  );
};

export default PurikuraButton;

const Button = styled.button`
  position: absolute;
  width: 25%;
  height: 85px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 22px;
  background: linear-gradient(180deg, #fff4fc 0%, #ffe7f8 100%);
  box-shadow:
    0 0 4.9px rgba(0, 0, 0, 0.09),
    inset -3px -5px 6px rgba(201, 122, 165, 0.25),
    inset 0 2px 8px rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transform: var(--button-transform, none) scale(var(--button-scale, 1));
  transform-origin: center;
  transition:
    filter 0.2s ease,
    transform 0.2s ease;

  &:hover {
    --button-scale: 1.05;
    filter: brightness(1.05);
  }

  &:active {
    --button-scale: 0.95;
  }
`;

const ButtonImage = styled.img`
  width: 50%;
  pointer-events: none;
`;

const ButtonText = styled.span`
  font-weight: 700;
`;
