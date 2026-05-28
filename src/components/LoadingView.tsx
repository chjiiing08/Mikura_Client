import bg from "../assets/basicBg.png";
import FullScreenBackground from "./FullScreenBackground";
import styled from "styled-components";

type LoadingViewProps = {
  icon: string;
};

function LoadingView({ icon }: LoadingViewProps) {
  return (
    <FullScreenBackground background={bg}>
      <LoadingIcon src={icon} alt="loading" />
    </FullScreenBackground>
  );
}

export default LoadingView;

const LoadingIcon = styled.img`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 35rem;
  transform: translate(-50%, -50%);
`;
