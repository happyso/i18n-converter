# 국제시장 - 다국어팩 HTML 텍스트 코드 컨버팅툴
다국어 코드화가 되어있지 않는 스킨내 텍스트를 코드화 합니다.
1. 시작어(스킨에 적용된 언어)와 번역될 언어를 선택합니다.
2. 스킨 내 텍스트 기반으로 텍스트 리스트를 생성합니다.
3. 텍스트 리스트 기반으로 구글 번역 API 사용해 메세지 아이디를 생성 및 영문 JSON을 제작합니다.
4. 그룹 아이디, 메세지 아이디가 완성된 JSON으로 스킨내 텍스트를 코드화 합니다.
5. 영문 JSON을 기준으로 번역 언어 별로 JSON을 생성합니다. ( ex : en.json / de.json / ja.json ...)

## 사용 방법
1. 시작어 ( 스킨에 적용된 언어 ) 확인
2. 번역언어 확인 ( 영문은 기본 번역됨, 영문외 17 언어 중 선택 - 다중선택가능 )
3. skin 폴더에 하위에 "지라번호+폴더작성 날짜" 의 폴더를 추가 생성
4. "지라번호+폴더작성 날짜" 하위에 default 폴더를 생성 하여 스킨 폴더 업로드
5. /config/credentials.json.example → credentials.json 로 확장자를 고치고 김소영 님께 json key를 받아서 복붙한다.

```bash
$ npm install -g yarn // yarn 설치 필요시
$ yarn install 
$ yarn run start
```

## 변경되는 모습
```bash
# as-is
<div class="header">
    <h3>Download Complete</h3>
</div>

# to-be
<div class="header">
    <h3>__COUPON_DOWNLOAD_COMPLETE#COUPON__</h3>
</div>
```

https://wiki.simplexi.com/pages/viewpage.action?pageId=2325391024
