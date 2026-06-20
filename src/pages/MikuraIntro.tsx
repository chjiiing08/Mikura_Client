import bg from "../assets/startBg.png";
import star1 from "../assets/star1.png";
import star2 from "../assets/star2.png";
import star3 from "../assets/star3.png";
import txt1 from "../assets/btntext1.png";
import txt2 from "../assets/btntext2.png";
import PurikuraButton from "../components/PikuraButton";
import FullScreenBackground from "../components/FullScreenBackground";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";

function MikuraIntro() {
  const navigate = useNavigate();
  return (
    <FullScreenBackground background={bg}>
      <GlowPoint $top="38%" $left="37%" />
      <GlowPoint $top="33%" $left="37%" $delay="0.7s" />
      <GlowPoint $top="33%" $left="63%" $delay="1.4s" />
      <GlowPoint $top="33%" $left="57.5%" $delay="1.4s" />
      <GlowPoint $top="32%" $left="49.5%" $delay="2.1s" />

      <Star src={star1} alt="" $top="5%" $left="20%" $width="15%" />
      <Star
        src={star2}
        alt=""
        $top="24%"
        $left="19%"
        $width="8%"
        $duration="2s"
        $delay="0.5s"
      />
      <Star
        src={star3}
        alt=""
        $bottom="30%"
        $right="25%"
        $width="13%"
        $duration="2.5s"
        $delay="1s"
      />

      <ButtonStack>                                                                                                                                           
        <GuideButton img={txt1} onClick={() => navigate("/guide")} />
        <PhotoBookButton img={txt2} onClick={() => navigate("/photobook")} />
      </ButtonStack>
    </FullScreenBackground>
  );
}

export default MikuraIntro;

const twinkle = keyframes`
  0%, 100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }

  50% {
    transform: scale(1) rotate(10deg);
    opacity: 1;
  }
`;

const glowSoft = keyframes`
  0%, 100% {
    opacity: 0.2;
    transform: scale(0.9);
  }

  50% {
    opacity: 0.6;
    transform: scale(1.3);
  }
`;

const GlowPoint = styled.div<{
  $top: string;
  $left: string;
  $delay?: string;
}>`
  position: absolute;
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 1) 10%,
    transparent 100%
  );
  opacity: 0.5;
  animation: ${glowSoft} 2.2s infinite ease-in-out;
  animation-delay: ${({ $delay = "0s" }) => $delay};
`;

const Star = styled.img<{
  $top?: string;
  $bottom?: string;
  $left?: string;
  $right?: string;
  $width: string;
  $duration?: string;
  $delay?: string;
}>`
  position: absolute;
  top: ${({ $top }) => $top};
  bottom: ${({ $bottom }) => $bottom};
  left: ${({ $left }) => $left};
  right: ${({ $right }) => $right};
  width: ${({ $width }) => $width};
  animation: ${twinkle} ${({ $duration = "1.5s" }) => $duration} infinite
    ease-in-out;
  animation-delay: ${({ $delay = "0s" }) => $delay};
`;

const ButtonStack = styled.div`
  position: absolute;
  bottom: 14vh;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  transform: translateX(-50%);
`;

const BaseButton = styled(PurikuraButton)`
  position: static;
  width: clamp(300px, 29vw, 520px);
  height: clamp(88px, 9vh, 108px);
  border: none;
`;

const GuideButton = styled(BaseButton)`
  width: clamp(300px, 29vw, 520px);
  height: clamp(88px, 9vh, 108px);

  & > img {
    width: 45%;
  }
`;

const PhotoBookButton = styled(BaseButton)`
  & > img {
    width: 70%;
  }
`;
