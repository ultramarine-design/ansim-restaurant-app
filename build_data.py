#!/usr/bin/env python3
"""전국_안심식당.csv 를 앱용 data/ JSON 으로 변환한다.
유효(RELAX_USE_YN=Y)만 추려 시도별 17개 파일과 index.json 을 만든다.
사용: python3 build_data.py
"""
import csv, json, os, collections, html

HERE = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(HERE, '..', 'ansim-restaurant-briefing', 'cache', '전국_안심식당.csv')
OUT_DIR = os.path.join(HERE, 'data')
UPDATED = '2025-07-09'   # data.go.kr 수정일. CSV 갱신 시 함께 바꾼다.

SIDO_ORDER = ['서울특별시','부산광역시','대구광역시','인천광역시','광주광역시','대전광역시','울산광역시','세종특별자치시',
              '경기도','강원특별자치도','충청북도','충청남도','전라북도','전북특별자치도','전라남도','경상북도','경상남도','제주특별자치도']

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    rows = list(csv.DictReader(open(CSV_PATH, encoding='utf-8-sig')))
    valid = [r for r in rows if r['RELAX_USE_YN'].strip() == 'Y']

    by_sido = collections.defaultdict(list)
    for r in valid:
        by_sido[r['RELAX_SI_NM'].strip()].append(r)

    index = []
    sido_keys = sorted(by_sido.keys(),
                       key=lambda s: (SIDO_ORDER.index(s) if s in SIDO_ORDER else 99, s))
    for i, sido in enumerate(sido_keys):
        recs = by_sido[sido]
        slug = f'sido-{i:02d}'
        gu_count = collections.Counter(r['RELAX_SIDO_NM'].strip() for r in recs)
        # 원본에 &amp;amp; 처럼 이중·삼중 인코딩된 값이 있어 안정될 때까지 푼다.
        def cell(v):
            s = v.strip()
            for _ in range(5):
                u = html.unescape(s)
                if u == s:
                    break
                s = u
            return s
        arr = [[
            cell(r['RELAX_RSTRNT_NM']),       # nm
            cell(r['RELAX_SIDO_NM']),         # gu (시군구)
            cell(r['RELAX_GUBUN_DETAIL']),    # gb (업종상세)
            cell(r['RELAX_ADD1']),            # ad (도로명 주소)
            cell(r['RELAX_RSTRNT_TEL']),      # tel
            cell(r['RELAX_RSTRNT_REG_DT']),   # dt (지정일)
        ] for r in recs]
        arr.sort(key=lambda x: (x[1], x[0]))
        with open(os.path.join(OUT_DIR, slug + '.json'), 'w', encoding='utf-8') as f:
            json.dump({'fields': ['nm','gu','gb','ad','tel','dt'], 'rows': arr},
                      f, ensure_ascii=False, separators=(',', ':'))
        gus = [{'nm': g, 'n': c} for g, c in sorted(gu_count.items(), key=lambda x: -x[1])]
        index.append({'sido': sido, 'slug': slug, 'count': len(recs), 'gus': gus})

    with open(os.path.join(OUT_DIR, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump({'updated': UPDATED, 'total': len(valid), 'sido': index},
                  f, ensure_ascii=False, separators=(',', ':'))

    print(f'유효 식당 {len(valid)}곳, 시도 {len(index)}개 파일 생성 완료.')

if __name__ == '__main__':
    main()
